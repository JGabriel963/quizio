import { expect, type Page, test } from "@playwright/test";

import { expectSaved, newParticipant, signUp } from "./support";

/** A saved quiz of one question, the first answer right (spec 006). */
async function publishedQuiz(page: Page, title: string, right: string) {
	await page.goto("/library");
	// A click before hydration is lost: click again until the editor opens.
	await expect(async () => {
		await page.getByRole("button", { name: "Criar", exact: true }).click();
		await expect(page).toHaveURL(/\/creator\//, { timeout: 3_000 });
	}).toPass({ timeout: 30_000 });
	const newQuiz = page.getByRole("dialog", { name: "Criar um novo quiz" });
	await newQuiz.getByRole("button", { name: /Tela em branco/ }).click();
	await expect(newQuiz).toBeHidden();
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill(`Pergunta de ${title}?`);
	await page
		.getByRole("textbox", { name: "Resposta 1", exact: true })
		.fill(right);
	await page
		.getByRole("textbox", { name: "Resposta 2", exact: true })
		.fill("Outra");
	await page.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(
		page.getByRole("dialog", { name: "O quiz está pronto" }),
	).toBeVisible();
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

const post = (page: Page, text: string) =>
	page.getByRole("article").filter({ hasText: text });

test.describe("compartilhado no grupo (spec 037)", () => {
	test("a administradora compartilha dois quizzes; o membro abre, vê as respostas, organiza ao vivo e duplica", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(180_000);
		await signUp(ana, { name: "Ana" });
		await publishedQuiz(ana, "Rios", "Amazonas");
		await publishedQuiz(ana, "Capitais", "Brasília");
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Turma 9C");

		// Compart. of the box: several at once (CA-02).
		await ana.goto(groupUrl);
		const select = ana.getByRole("dialog", { name: "Selecionar kahoot" });
		await expect(async () => {
			await ana
				.getByRole("region", { name: "Publicar algo" })
				.getByRole("button", { name: "Compart." })
				.click();
			await expect(select).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 30_000 });
		await select.getByRole("button", { name: /Rios/ }).click();
		await select.getByRole("button", { name: /Capitais/ }).click();
		await select
			.getByRole("button", { name: "Compartilhar 2 kahoots" })
			.click();
		await expect(select).toBeHidden();
		await expect(
			ana.getByRole("article").filter({ hasText: "múltiplos kahoots" }),
		).toContainText("Ana compartilhou múltiplos kahoots");

		// The member's tab and the quiz's page (CA-06, CA-08).
		await bruno.goto(`${groupUrl}?tab=shared`);
		await expect(bruno.getByRole("heading", { name: "Kahoots" })).toBeVisible();
		await expect(bruno.getByRole("article")).toHaveCount(2);
		await bruno.getByRole("link", { name: "Capitais" }).click();
		await expect(
			bruno.getByRole("heading", { name: "Capitais", level: 1 }),
		).toBeVisible();
		await expect(bruno.getByText("Perguntas (1)")).toBeVisible();
		await expect(bruno.getByText("Brasília")).toHaveCount(0);
		await bruno.getByRole("button", { name: "Mostrar respostas" }).click();
		await expect(
			bruno.getByText("Brasília").locator("xpath=ancestor::li[1]"),
		).toContainText("(correta)");
		const pageUrl = bruno.url();

		// Organizar ao vivo is the member's own game (CA-11).
		await bruno.getByRole("button", { name: "Organizar ao vivo" }).click();
		await expect(bruno).toHaveURL(/\/host\//);

		// Duplicar makes the member's draft (CA-13).
		await bruno.goto(pageUrl);
		await bruno.getByRole("button", { name: "Duplicar" }).click();
		await expect(bruno).toHaveURL(/\/creator\//);
		await expect(
			bruno.getByRole("textbox", { name: "Título do quiz" }),
		).toHaveValue("Capitais (cópia)");
	});

	test("o membro compartilha um quiz pela publicação e o remove do grupo", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(180_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		await publishedQuiz(bruno, "Mapas", "Europa");
		const groupUrl = await groupWithBruno(ana, bruno, "Turma 9D");

		await bruno.goto(groupUrl);
		const compose = bruno.getByRole("dialog", { name: "Criar publicação" });
		await expect(async () => {
			await bruno.getByRole("button", { name: "Publicar algo" }).click();
			await expect(compose).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 30_000 });
		await compose.getByLabel("Mensagem").fill("Para a revisão");
		await compose.getByRole("button", { name: "Compartilhar kahoot" }).click();
		await bruno
			.getByRole("dialog", { name: "Selecionar kahoot" })
			.getByRole("button", { name: /Mapas/ })
			.click();
		await expect(compose).toContainText("Mapas");
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();

		const shared = post(bruno, "Para a revisão");
		await expect(shared).toContainText("Bruno compartilhou um kahoot");
		await expect(shared.getByText("Iniciar")).toBeVisible();

		// Ana sees it and opens it from the post (CA-04, CA-08).
		await ana.goto(groupUrl);
		await post(ana, "Para a revisão").getByText("Iniciar").click();
		await expect(
			ana.getByRole("heading", { name: "Mapas", level: 1 }),
		).toBeVisible();

		// Bruno removes it (CA-14).
		await bruno.reload();
		await post(bruno, "Para a revisão")
			.getByRole("button", { name: "Opções de Mapas" })
			.click();
		await bruno.getByRole("menuitem", { name: "Remover do grupo" }).click();
		await bruno
			.getByRole("alertdialog", { name: "Remover do grupo?" })
			.getByRole("button", { name: "Remover" })
			.click();
		await expect(post(bruno, "Para a revisão")).toContainText(
			"Bruno compartilhou um arquivo",
		);
		await expect(post(bruno, "Para a revisão")).toContainText(
			"Bruno excluiu o anexo da publicação",
		);
		await bruno.goto(`${groupUrl}?tab=shared`);
		await expect(
			bruno.getByText("Ainda não há kahoots compartilhados neste grupo."),
		).toBeVisible();
	});

	test("sem a chave, o membro não compartilha", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Turma 9E");

		await ana.goto(`${groupUrl}/settings`);
		const toggle = ana.getByRole("switch", {
			name: "Os membros podem compartilhar conteúdo",
		});
		await expect(toggle).toBeChecked();
		await toggle.click();
		await expect(toggle).not.toBeChecked();
		await ana.reload();
		await expect(
			ana.getByRole("switch", {
				name: "Os membros podem compartilhar conteúdo",
			}),
		).not.toBeChecked();

		await bruno.goto(groupUrl);
		await expect(
			bruno.getByRole("region", { name: "Publicar algo" }),
		).toBeVisible();
		await expect(bruno.getByRole("button", { name: "Compart." })).toHaveCount(
			0,
		);
		await bruno.goto(`${groupUrl}?tab=shared`);
		await expect(
			bruno.getByText("Ainda não há kahoots compartilhados neste grupo."),
		).toBeVisible();
		await expect(bruno.getByRole("button", { name: "Compart." })).toHaveCount(
			0,
		);
	});
});
