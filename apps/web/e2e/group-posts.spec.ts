import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	expectSaved,
	newParticipant,
	signUp,
} from "./support";

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

/** "Publicar algo" opens "Criar publicação" (spec 036, RN-02). */
async function openComposer(page: Page) {
	const dialog = page.getByRole("dialog", { name: "Criar publicação" });
	await expect(async () => {
		await page.getByRole("button", { name: "Publicar algo" }).click();
		await expect(dialog).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	return dialog;
}

const post = (page: Page, text: string) =>
	page.getByRole("article").filter({ hasText: text });

// A 1×1 PNG and a tiny PDF, enough for the browser and the bucket.
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);
const PDF = Buffer.from(
	"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe("publicações no grupo (spec 036)", () => {
	test("um membro publica uma mensagem com link; o administrador vê e curte", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Turma 7A");

		await bruno.goto(groupUrl);
		const compose = await openComposer(bruno);
		// A member has no Atribuir kahoot (CA-02).
		await expect(
			compose.getByRole("button", { name: "Atribuir kahoot" }),
		).toHaveCount(0);
		await compose
			.getByLabel("Mensagem")
			.fill("Prova na sexta. Leiam https://exemplo.com/aula.");
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();
		const brunoPost = post(bruno, "Prova na sexta");
		await expect(brunoPost).toContainText("Bruno compartilhou uma mensagem");
		const link = brunoPost.getByRole("link", {
			name: "https://exemplo.com/aula",
		});
		await expect(link).toHaveAttribute("target", "_blank");

		await ana.goto(groupUrl);
		const anaPost = post(ana, "Prova na sexta");
		await expect(anaPost).toContainText("Bruno compartilhou uma mensagem");
		await anaPost.getByRole("button", { name: "Curtir" }).click();
		await expect(anaPost).toContainText("1 curtida");
		// The admin's setup card counts it (CA-03).
		await expect(
			ana.getByRole("button", { name: "Criar publicação (feito)" }),
		).toBeVisible();
	});

	test("imagem e PDF no mural; excluir a publicação com PDF", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(ana, { name: "Ana" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		const groupUrl = await groupWithBruno(ana, bruno, "Coral");

		// An image alone (CA-06).
		await bruno.goto(groupUrl);
		let compose = await openComposer(bruno);
		await compose.getByLabel("Escolher imagem").setInputFiles({
			name: "quadro.png",
			mimeType: "image/png",
			buffer: PNG,
		});
		await expect(compose.getByAltText("Imagem anexada")).toBeVisible();
		await expect(
			compose.getByRole("button", { name: "Publicar" }),
		).toBeEnabled();
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();
		const imagePost = bruno
			.getByRole("article")
			.filter({ hasText: "Bruno compartilhou uma imagem" });
		const image = imagePost.getByRole("img", {
			name: "Imagem publicada por Bruno",
		});
		await expect(image).toBeVisible();
		await expect
			.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
			.toBeGreaterThan(0);

		// A PDF with text (CA-07).
		compose = await openComposer(bruno);
		await compose.getByLabel("Mensagem").fill("Leiam até o cap. 3");
		await compose.getByLabel("Escolher PDF").setInputFiles({
			name: "apostila.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(compose).toContainText("apostila.pdf");
		await expect(
			compose.getByRole("button", { name: "Publicar" }),
		).toBeEnabled();
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();

		await ana.goto(groupUrl);
		const pdfPost = post(ana, "Leiam até o cap. 3");
		await expect(pdfPost).toContainText("Bruno compartilhou um arquivo");
		const card = pdfPost.getByRole("link", { name: /apostila\.pdf/ });
		await expect(card).toHaveAttribute("target", "_blank");
		const href = (await card.getAttribute("href")) ?? "";
		expect((await ana.request.get(href)).status()).toBe(200);

		// The admin deletes it, and the file goes too (CA-15).
		await pdfPost.getByRole("button", { name: "Opções da publicação" }).click();
		await ana.getByRole("menuitem", { name: "Excluir publicação" }).click();
		const confirm = ana.getByRole("alertdialog", {
			name: "Excluir a publicação?",
		});
		await expect(confirm).toContainText("com o arquivo");
		await confirm.getByRole("button", { name: "Excluir" }).click();
		await expect(post(ana, "Leiam até o cap. 3")).toHaveCount(0);
		await expect
			.poll(async () => (await ana.request.get(href)).status())
			.not.toBe(200);
	});

	test("atribuir pela publicação", async ({ page: ana }) => {
		test.setTimeout(120_000);
		await signUp(ana, { name: "Ana" });
		await createQuizInEditor(ana);
		await ana.getByRole("textbox", { name: "Título do quiz" }).fill("Rios");
		await ana
			.getByRole("textbox", { name: "Pergunta" })
			.fill("Maior rio do Brasil?");
		await ana
			.getByRole("textbox", { name: "Resposta 1", exact: true })
			.fill("Amazonas");
		await ana
			.getByRole("textbox", { name: "Resposta 2", exact: true })
			.fill("São Francisco");
		await ana.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
		await ana.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
		await expectSaved(ana);
		await ana.getByRole("button", { name: "Salvar", exact: true }).click();
		await expect(
			ana.getByRole("dialog", { name: "O quiz está pronto" }),
		).toBeVisible();

		await ana.goto("/groups");
		const create = ana.getByRole("dialog", { name: "Criar grupo" });
		await expect(async () => {
			await ana.getByRole("button", { name: "Criar grupo" }).first().click();
			await expect(create).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 30_000 });
		await create.getByLabel("Nome").fill("Turma 8B");
		await create.getByRole("button", { name: "Criar grupo" }).click();
		await expect(ana.getByRole("heading", { name: "Turma 8B" })).toBeVisible();

		const compose = await openComposer(ana);
		await compose.getByLabel("Mensagem").fill("Para segunda");
		await compose.getByRole("button", { name: "Atribuir kahoot" }).click();
		await ana
			.getByRole("dialog", { name: "Selecionar kahoot" })
			.getByRole("button", { name: /Rios/ })
			.click();
		await ana
			.getByRole("dialog", { name: "Configurações da atividade atribuída" })
			.getByRole("button", { name: "Adicionar à publicação" })
			.click();
		await expect(compose).toContainText("Rios");
		await expect(compose.getByLabel("Mensagem")).toHaveValue("Para segunda");
		await compose.getByRole("button", { name: "Publicar" }).click();
		await expect(compose).toBeHidden();

		const assigned = post(ana, "Para segunda");
		await expect(assigned).toContainText("Ana atribuiu um kahoot");
		await expect(assigned.getByText("Iniciar")).toBeVisible();
	});
});
