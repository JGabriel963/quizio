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

/** From the cover to the first question: Iniciar and the nickname (CA-01 to CA-03). */
async function enterActivity(page: Page, nickname: string) {
	await page.getByRole("button", { name: "Iniciar" }).click();
	await page.getByRole("textbox", { name: "Insira um apelido" }).fill(nickname);
	await page.getByRole("button", { name: "Ok, vamos lá!" }).click();
	await expect(
		page.getByRole("heading", { name: "Capital do Brasil?" }),
	).toBeVisible();
}

/** The question answered, its result, Pontuações and the end (CA-06 to CA-11, CA-17). */
async function playToTheEnd(page: Page, answer: string, result: string) {
	await page.getByRole("button", { name: new RegExp(answer) }).click();
	await expect(page.getByText(result, { exact: true })).toBeVisible();
	// Pontuações comes by itself after the result (RN-12).
	await expect(page.getByRole("heading", { name: "Pontuações" })).toBeVisible();
	// ← shows the result of the question just answered (CA-11).
	await page.getByRole("button", { name: "Anterior" }).click();
	await expect(
		page.getByRole("heading", { name: "Capital do Brasil?" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Anterior" })).toHaveCount(0);
	await page.getByRole("button", { name: "Próximo" }).click();
	await expect(page.getByRole("heading", { name: "Pontuações" })).toBeVisible();
	await page.getByRole("button", { name: "Próximo" }).click();
	await expect(
		page.getByRole("button", { name: "Entrar em outro jogo" }),
	).toBeVisible();
}

const noSideScroll = (page: Page) =>
	page.evaluate(
		() =>
			document.documentElement.scrollWidth <=
			document.documentElement.clientWidth,
	);

test.describe("jogar a atribuição (spec 030)", () => {
	test("two participants play an assignment to the end", async ({
		page: creator,
		browser,
		context,
	}) => {
		test.setTimeout(150_000);
		await signUp(creator, { name: "Ana" });
		await publishQuiz(creator, "Capitais");

		await readyDialog(creator)
			.getByRole("button", { name: /^Atribuir/ })
			.click();
		await creator
			.getByRole("dialog", { name: "Configurar atividade" })
			.getByRole("button", { name: "Criar uma tarefa" })
			.click();
		const share = creator.getByRole("dialog", {
			name: "Compartilhe com os participantes",
		});
		const pinText = await share.locator("strong").last().textContent();
		const pin = (pinText ?? "").replace(/\s/g, "");
		await share.getByRole("link", { name: /Capitais/ }).click();
		await expect(
			creator.getByRole("heading", { level: 1, name: "Capitais" }),
		).toBeVisible();
		const gameId = creator.url().split("/reports/")[1]?.split("?")[0] ?? "";

		// Ana by the link: right answer, first place (CA-14, CA-17).
		const ana = await newParticipant(browser);
		await ana.goto(`/assignment/${gameId}`);
		// The activity's page is compiled on its first visit to a fresh dev server.
		await expect(ana.getByText("1 pergunta")).toBeVisible({ timeout: 15_000 });
		expect(await noSideScroll(ana)).toBe(true);
		await enterActivity(ana, "Ana P");
		expect(await noSideScroll(ana)).toBe(true);
		await playToTheEnd(ana, "Brasília", "Correto");
		await expect(ana.getByRole("heading", { name: "1º lugar" })).toBeVisible();
		// Who just finished reviews the questions with ←, the points at once (CA-18).
		await ana.getByRole("button", { name: "Anterior" }).click();
		await expect(
			ana.getByRole("heading", { name: "Capital do Brasil?" }),
		).toBeVisible();
		await expect(ana.getByText(/^\+ \d+$/)).toBeVisible();
		await ana.getByRole("button", { name: "Próximo" }).click();

		// Bia by the PIN: Ana is listed only to see, and her nickname is no way
		// into her place from another browser (CA-02, CA-03).
		const bia = await newParticipant(browser);
		await bia.goto("/join");
		await bia.getByRole("textbox", { name: "PIN" }).fill(pin);
		await bia.getByRole("button", { name: "Entrar" }).click();
		await expect(bia).toHaveURL(new RegExp(`/assignment/${gameId}$`));
		await bia.getByRole("button", { name: "Iniciar" }).click();
		const joined = bia.getByRole("list", { name: "Quem já entrou" });
		await expect(joined.getByText("Ana P")).toBeVisible();
		await expect(joined.getByRole("button")).toHaveCount(0);
		await bia.getByRole("textbox", { name: "Insira um apelido" }).fill("ana p");
		await bia.getByRole("button", { name: "Ok, vamos lá!" }).click();
		await expect(bia.getByRole("alert")).toHaveText(
			"Esse apelido já está em uso. Escolha outro.",
		);
		await expect(bia.getByRole("heading", { name: /Você é/ })).toHaveCount(0);
		await bia.getByRole("textbox", { name: "Insira um apelido" }).fill("Bia");
		await bia.getByRole("button", { name: "Ok, vamos lá!" }).click();
		// Wrong answer, second (CA-15, CA-23).
		await playToTheEnd(bia, "Rio de Janeiro", "Incorreto");
		await expect(bia.getByRole("heading", { name: "2º lugar" })).toBeVisible();

		// Ana back to the link: "Você é Ana P?", Sim, her end with Bia below
		// and no ← (CA-19, CA-21, CA-22).
		await ana.reload();
		await ana.getByRole("button", { name: "Sim" }).click();
		const standings = ana.getByRole("list", { name: "Pontuações" });
		await expect(standings.getByRole("listitem")).toHaveCount(2);
		await expect(standings.getByRole("listitem").nth(1)).toContainText("Bia");
		await expect(ana.getByRole("button", { name: "Anterior" })).toHaveCount(0);

		// The report shows both, and Jogue este quiz opens the activity (CA-24, CA-25).
		await creator.reload();
		const tabs = creator.getByRole("navigation", {
			name: "Partes do relatório",
		});
		await tabs.getByRole("link", { name: /Participantes/ }).click();
		await expect(creator.getByText("Ana P")).toBeVisible();
		await expect(creator.getByText("Bia", { exact: true })).toBeVisible();
		await tabs.getByRole("link", { name: /Resumo/ }).click();
		const opened = context.waitForEvent("page");
		await creator.getByRole("link", { name: /Jogue este quiz/ }).click();
		const tab = await opened;
		await expect(tab).toHaveURL(new RegExp(`/assignment/${gameId}$`));
		await expect(tab.getByRole("button", { name: "Iniciar" })).toBeVisible();
	});
});
