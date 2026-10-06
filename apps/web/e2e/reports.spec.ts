import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	hideDevtools,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

/** A phase lasts up to 6.5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 20_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const reportRows = (page: Page) =>
	page.getByRole("list", { name: "Relatórios" }).getByRole("listitem");

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

test.describe("relatórios (spec 015)", () => {
	// Short on purpose: one question and one player. The numbers of a report
	// are covered by the tests below this one.
	test("do pódio ao relatório: resumo, abas, lixeira com desfazer e jogar de novo", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(host);
		await publishQuiz(host, "Capitais");
		const ana = await newParticipant(browser);
		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		await host.getByRole("button", { name: "Iniciar" }).click();
		await ana
			.getByRole("button", { name: "Triângulo vermelho" })
			.click(NEXT_PHASE);
		await host.getByRole("button", { name: "Avançar" }).click(NEXT_PHASE);

		// CA-39: from the podium to the report of that game.
		await hideDevtools(host);
		await host
			.getByRole("button", { name: "Ver relatório" })
			.click({ timeout: 20_000 });
		await expect(host).toHaveURL(/\/reports\/[^/?]+/);
		await expect(
			host.getByRole("heading", { level: 1, name: "Capitais" }),
		).toBeVisible();

		// CA-01, CA-22, CA-24: the summary of a game everybody got right.
		const overall = host.getByRole("region", { name: "Resultado geral" });
		await expect(overall).toContainText("100%");
		await expect(overall).toContainText("Excelente resultado!");
		await expect(host.getByRole("region", { name: "Totais" })).toContainText(
			"Participantes1",
		);
		await expect(
			host.getByText("Nenhuma pergunta foi difícil para o grupo"),
		).toBeVisible();

		// CA-23: the tab is in the address, and a reload keeps it.
		const tabs = host.getByRole("navigation", { name: "Partes do relatório" });
		await tabs.getByRole("link", { name: /Perguntas/ }).click();
		await expect(host).toHaveURL(/tab=questions/);
		await host.reload();
		await expect(tabs.getByRole("link", { name: /Perguntas/ })).toHaveAttribute(
			"aria-current",
			"page",
		);

		// CA-31: how the group answered the question.
		await host.getByRole("link", { name: "Capital do Brasil?" }).click();
		const detail = host.getByRole("dialog");
		await expect(
			detail.getByRole("list", { name: "Alternativas" }),
		).toContainText("BrasíliaCorreta1");
		await detail.getByRole("button", { name: "Fechar" }).click();
		await expect(detail).toHaveCount(0);

		// CA-29: what a participant answered.
		await tabs.getByRole("link", { name: /Participantes/ }).click();
		await host.getByRole("link", { name: "Ana", exact: true }).click();
		await expect(
			host.getByRole("dialog").getByRole("list", { name: "Respostas" }),
		).toContainText("Correta");

		// CA-40: to the trash, and back with "Desfazer".
		await host.goto("/reports");
		await expect(reportRows(host)).toHaveCount(1);
		await host.getByRole("button", { name: "Ações para Capitais" }).click();
		await host.getByRole("menuitem", { name: "Mover para a lixeira" }).click();
		await expect(
			host.getByText("Você ainda não tem relatórios."),
		).toBeVisible();
		await host.getByRole("button", { name: "Desfazer" }).click();
		await expect(reportRows(host)).toHaveCount(1);

		// CA-36: another game of the same quiz, with nobody in it.
		await host.getByRole("button", { name: "Ações para Capitais" }).click();
		await host.getByRole("menuitem", { name: "Jogar de novo" }).click();
		await expect(host).toHaveURL(/\/host\//);
		expect(await lobbyPin(host)).not.toBe(pin);
	});
});
