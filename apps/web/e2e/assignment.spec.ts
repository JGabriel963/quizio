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

test.describe("atribuir (spec 029)", () => {
	test("atribui um quiz, compartilha, altera o prazo e encerra", async ({
		page: creator,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(creator, { name: "Ana" });
		await publishQuiz(creator, "Capitais");

		// Configurar atividade, with the default deadline (CA-03, CA-01).
		await readyDialog(creator)
			.getByRole("button", { name: /^Atribuir/ })
			.click();
		const configure = creator.getByRole("dialog", {
			name: "Configurar atividade",
		});
		await expect(configure.getByText("Em 3 dias")).toBeVisible();
		await configure.getByRole("button", { name: "Criar uma tarefa" }).click();

		// Compartilhe com os participantes (CA-16).
		const share = creator.getByRole("dialog", {
			name: "Compartilhe com os participantes",
		});
		await expect(share.getByText("Termina: em 3 dias")).toBeVisible();
		const pinText = await share.locator("strong").last().textContent();
		const pin = (pinText ?? "").replace(/\s/g, "");
		expect(pin).toMatch(/^\d{8}$/);
		await share.getByRole("link", { name: /Capitais/ }).click();

		// The report of the open assignment (CA-24, CA-26).
		await expect(
			creator.getByRole("heading", { level: 1, name: "Capitais" }),
		).toBeVisible();
		await expect(creator.getByText("Termina: em 3 dias")).toBeVisible();
		await expect(
			creator.getByRole("heading", { name: "Convide mais participantes!" }),
		).toBeVisible();
		const reportUrl = creator.url();
		const gameId = reportUrl.split("/reports/")[1]?.split("?")[0] ?? "";

		// Someone without an account opens the link (CA-39)…
		const visitor = await newParticipant(browser);
		await visitor.goto(`/assignment/${gameId}`);
		await visitor.getByRole("button", { name: "Iniciar" }).click();
		await expect(
			visitor.getByText("Atividade por Ana", { exact: false }),
		).toBeVisible();
		await expect(visitor.getByText("Aberto por 3 dias")).toBeVisible();
		await expect(
			visitor.getByRole("button", { name: "Ok, vamos lá!" }),
		).toBeEnabled();

		// …and someone types the PIN (CA-40).
		await visitor.goto("/join");
		await visitor.getByRole("textbox", { name: "PIN" }).fill(pin);
		await visitor.getByRole("button", { name: "Entrar" }).click();
		await expect(visitor).toHaveURL(new RegExp(`/assignment/${gameId}$`));
		await expect(
			visitor.getByRole("heading", { name: "Capitais" }),
		).toBeVisible();

		// Alterar prazo (CA-31): the last day this month's calendar allows.
		await creator.getByRole("button", { name: "Alterar prazo" }).click();
		const change = creator.getByRole("dialog", { name: "Alterar o prazo" });
		await change.locator("table button:not([disabled])").last().click();
		await change.getByRole("button", { name: "Salvar" }).click();
		await expect(change).toBeHidden();
		await expect(creator.getByText(/^Termina: em /)).toBeVisible();

		// Encerrar agora (CA-34).
		await creator.getByRole("button", { name: "Encerrar agora" }).click();
		await creator
			.getByRole("alertdialog", { name: "Encerrar este quiz atribuído?" })
			.getByRole("button", { name: "Encerrar agora" })
			.click();
		await expect(creator.getByText("Encerrada", { exact: true })).toBeVisible();

		await visitor.goto(`/assignment/${gameId}`);
		await expect(
			visitor.getByRole("heading", { name: "Esta atividade foi encerrada" }),
		).toBeVisible();

		// It is in the reports, ended (CA-24, CA-36).
		await creator.goto("/reports");
		await expect(
			creator.getByRole("link", { name: "Capitais" }).first(),
		).toBeVisible();
	});
});
