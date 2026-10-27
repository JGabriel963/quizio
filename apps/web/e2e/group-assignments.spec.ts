import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	expectSaved,
	newParticipant,
	signUp,
} from "./support";

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });

/** A playable quiz of one Quiz question of two answers, the first one right. */
async function publishQuiz(page: Page, title: string) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Capital do Brasil?");
	await page
		.getByRole("textbox", { name: "Resposta 1", exact: true })
		.fill("Brasília");
	await page
		.getByRole("textbox", { name: "Resposta 2", exact: true })
		.fill("Rio de Janeiro");
	await page.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

/** Ana's group with Bruno in it, joined by the link (spec 034). */
async function groupWithBruno(ana: Page, bruno: Page, name: string) {
	await ana.goto("/groups");
	const create = ana.getByRole("dialog", { name: "Criar grupo" });
	// A click before hydration is lost: click again until it opens.
	await expect(async () => {
		await ana.getByRole("button", { name: "Criar grupo" }).first().click();
		await expect(create).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await create.getByLabel("Nome").fill(name);
	await create.getByRole("button", { name: "Criar grupo" }).click();
	await expect(ana.getByRole("heading", { name })).toBeVisible();
	const groupUrl = ana.url().replace(/\?.*$/, "");

	await ana.getByRole("button", { name: "Adicionar membros" }).click();
	const invite = ana.getByRole("dialog", { name: "Convidar usuários" });
	const field = invite.getByLabel("Compartilhar link de convite");
	await expect(field).toHaveValue(/\/invite\//);
	const link = await field.inputValue();
	await ana.keyboard.press("Escape");

	await bruno.goto(link);
	await bruno.getByRole("button", { name: "Aceitar convite" }).click();
	await expect(bruno.getByRole("heading", { name })).toBeVisible();
	return groupUrl;
}

/** Atribuir in the group: the quiz, the default deadline (spec 038, CA-01). */
async function assignInGroup(page: Page, quiz: string) {
	const select = page.getByRole("dialog", { name: "Selecionar kahoot" });
	await expect(async () => {
		await page.getByRole("button", { name: "Atribuir" }).first().click();
		await expect(select).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await select.getByRole("button", { name: new RegExp(quiz) }).click();
	return page.getByRole("dialog", {
		name: "Configurações da atividade atribuída",
	});
}

const post = (page: Page, text: string) =>
	page.getByRole("article").filter({ hasText: text });

test.describe("atribuições no grupo (spec 038)", () => {
	test("o administrador atribui com mensagem; o membro vê, curte e inicia; encerrar deixa compartilhou um arquivo", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(ana, { name: "Ana" });
		await publishQuiz(ana, "Capitais");
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Turma 7A");

		// Adicionar mensagem → Publicar (CA-05).
		const settings = await assignInGroup(ana, "Capitais");
		await settings.getByRole("button", { name: "Adicionar mensagem" }).click();
		const compose = ana.getByRole("dialog", { name: "Criar publicação" });
		await compose.getByLabel("Mensagem").fill("Revisem até sexta");
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();
		const anaPost = post(ana, "Revisem até sexta");
		await expect(anaPost).toContainText("Ana atribuiu um kahoot");
		await expect(anaPost).toContainText("Capitais");

		// The member sees it, likes it and finds Iniciar to a new tab (CA-08, CA-10).
		await bruno.goto(groupUrl);
		const brunoPost = post(bruno, "Revisem até sexta");
		await expect(brunoPost).toContainText("Ana atribuiu um kahoot");
		await brunoPost.getByRole("button", { name: "Curtir" }).click();
		await expect(brunoPost).toContainText("1 curtida");
		await bruno.reload();
		await expect(
			post(bruno, "Revisem até sexta").getByRole("button", { name: "Curtida" }),
		).toBeVisible();
		const start = post(bruno, "Revisem até sexta").getByText("Iniciar");
		await expect(start).toHaveAttribute("href", /\/assignment\/[^/]+$/);
		await expect(start).toHaveAttribute("target", "_blank");
		// A member has no ⋮ on someone else's post (CA-11).
		await expect(
			post(bruno, "Revisem até sexta").getByRole("button", {
				name: "Opções da publicação",
			}),
		).toHaveCount(0);

		// The Atribuições tab, cards and list (CA-13).
		await bruno.goto(`${groupUrl}?tab=assignments`);
		await expect(bruno.getByRole("heading", { name: "Kahoots" })).toBeVisible();
		await expect(
			bruno.getByRole("article").filter({ hasText: "Capitais" }),
		).toBeVisible();
		await bruno.getByRole("button", { name: "Lista" }).click();
		await expect(
			bruno.getByRole("table", { name: "Atribuições do grupo" }),
		).toContainText("Capitais");
		await bruno.reload();
		await expect(
			bruno.getByRole("table", { name: "Atribuições do grupo" }),
		).toBeVisible();

		// The admin ends it from the report, through the post's ⋮ (CA-08a, CA-11).
		await ana.reload();
		await post(ana, "Revisem até sexta")
			.getByRole("button", { name: "Opções da publicação" })
			.click();
		await ana.getByRole("menuitem", { name: "Ver relatório" }).click();
		await expect(
			ana.getByRole("heading", { level: 1, name: "Capitais" }),
		).toBeVisible();
		await ana.getByRole("button", { name: "Encerrar agora" }).click();
		await ana
			.getByRole("alertdialog", { name: "Encerrar este quiz atribuído?" })
			.getByRole("button", { name: "Encerrar agora" })
			.click();
		await expect(ana.getByText("Encerrada", { exact: true })).toBeVisible();

		await bruno.goto(groupUrl);
		const ended = post(bruno, "Revisem até sexta");
		await expect(ended).toContainText("Ana compartilhou um arquivo");
		await expect(ended).toContainText("Ana excluiu o anexo da publicação");
		await expect(ended).toContainText("1 curtida");
		await bruno.goto(`${groupUrl}?tab=assignments`);
		await expect(
			bruno.getByText("Nenhuma atividade foi atribuída a este grupo ainda."),
		).toBeVisible();
	});

	test("uma atribuição feita fora do grupo vai a ele por Atribuir a grupos", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Coral");

		// "Atribuir" of "O quiz está pronto", as in the library (spec 029).
		await publishQuiz(ana, "Planetas");
		await readyDialog(ana)
			.getByRole("button", { name: /^Atribuir/ })
			.click();
		const configure = ana.getByRole("dialog", { name: "Configurar atividade" });
		await configure.getByRole("button", { name: "Criar uma tarefa" }).click();
		const share = ana.getByRole("dialog", {
			name: "Compartilhe com os participantes",
		});
		await share
			.getByRole("button", { name: "Adicionar participantes" })
			.click();
		await ana.getByRole("menuitem", { name: "Atribuir a grupos" }).click();

		// CA-16: the group, checked, then "Já atribuída" on the way back.
		const groups = ana.getByRole("dialog", { name: "Atribuir a grupos" });
		await groups.getByRole("checkbox", { name: "Coral" }).click();
		await groups.getByRole("button", { name: "Atribuir" }).click();
		await expect(ana.getByText("Atividade atribuída a 1 grupo.")).toBeVisible();
		await expect(groups).toBeHidden();

		await share
			.getByRole("button", { name: "Adicionar participantes" })
			.click();
		await ana.getByRole("menuitem", { name: "Atribuir a grupos" }).click();
		await expect(groups.getByText("Já atribuída")).toBeVisible();
		await expect(groups.getByRole("checkbox", { name: "Coral" })).toBeChecked();

		await bruno.goto(groupUrl);
		await expect(post(bruno, "Planetas")).toContainText(
			"Ana atribuiu um kahoot",
		);
	});

	test("o administrador lê o relatório de um membro sem poder mudá-lo", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Jovens");

		// Members may assign once the admin lets them (spec 035, RN-01).
		await ana.goto(`${groupUrl}/settings`);
		const toggle = ana.getByRole("switch", {
			name: "Os membros podem criar atividades",
		});
		await toggle.click();
		await expect(toggle).toBeChecked();

		await publishQuiz(bruno, "Rios");
		await bruno.goto(groupUrl);
		const settings = await assignInGroup(bruno, "Rios");
		await settings.getByRole("button", { name: "Atribuir agora" }).click();
		await expect(settings).toBeHidden();
		await expect(post(bruno, "Rios")).toContainText("Bruno atribuiu um kahoot");

		await ana.goto(groupUrl);
		await post(ana, "Rios")
			.getByRole("button", { name: "Opções da publicação" })
			.click();
		await ana.getByRole("menuitem", { name: "Ver relatório" }).click();
		await expect(
			ana.getByRole("heading", { level: 1, name: "Rios" }),
		).toBeVisible();
		await expect(
			ana.getByRole("button", { name: "Renomear relatório" }),
		).toHaveCount(0);
		await expect(
			ana.getByRole("button", { name: "Opções de relatório" }),
		).toHaveCount(0);
		await expect(
			ana.getByRole("button", { name: "Encerrar agora" }),
		).toHaveCount(0);
		await expect(
			ana.getByRole("button", { name: "Alterar prazo" }),
		).toHaveCount(0);
	});
});
