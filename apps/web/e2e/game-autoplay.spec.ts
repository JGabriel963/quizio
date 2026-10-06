import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

/** A phase lasts up to 6.5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 20_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const settings = (host: Page) =>
	host.getByRole("dialog", { name: "Configurações" });
const answerButtons = (player: Page) =>
	player.locator('[data-slot="answer-button"]');

/** A playable quiz of one Quiz question of two answers and 20 seconds. */
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

test.describe("reprodução automática (spec 014)", () => {
	// Short on purpose: the 15 s of the lobby and the scoreboard are covered by
	// the tests below this one, with a clock in hand.
	test("com a chave ligada, a contagem aparece no lobby e a revelação vai sozinha ao pódio", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(host);
		await publishQuiz(host, "Capitais");
		const ana = await newParticipant(browser);
		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);

		// CA-01: the switch is in the panel, off for a first game.
		await host.getByRole("button", { name: "Configurações" }).click();
		const autoplay = settings(host).getByRole("switch", {
			name: "Reprodução automática",
		});
		await expect(autoplay).toHaveAttribute("aria-checked", "false");
		await autoplay.click();
		await expect(autoplay).toHaveAttribute("aria-checked", "true");
		await settings(host).getByRole("button", { name: "Fechar" }).click();
		await expect(settings(host)).toHaveCount(0);

		// CA-06: nobody in the lobby, no countdown.
		const startsIn = host.getByRole("timer", { name: "Inicia em" });
		await expect(startsIn).toHaveCount(0);

		// CA-05: with a player, the countdown shows beside Iniciar.
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		await expect(startsIn).toBeVisible();
		await expect(startsIn).toHaveText(/^1[0-5]/);

		// CA-08: Iniciar does not wait for it.
		await host.getByRole("button", { name: "Iniciar" }).click();
		await expect(answerButtons(ana)).toHaveCount(2, NEXT_PHASE);
		await ana.getByRole("button", { name: "Triângulo vermelho" }).click();

		// CA-15, CA-17: the results count in the place of Avançar and go by
		// themselves to the podium.
		const advancesIn = host.getByRole("timer", { name: "Avança em" });
		await expect(advancesIn).toBeVisible();
		await expect(host.getByRole("button", { name: "Avançar" })).toHaveCount(0);
		const podium = host.getByLabel("Pódio");
		await expect(podium).toBeVisible({ timeout: 10_000 });
		await expect(advancesIn).toHaveCount(0);

		// CA-22: the podium stays; nothing starts by itself after it.
		await expect(
			host.getByRole("button", { name: "Jogar novamente" }),
		).toBeVisible({ timeout: 15_000 });
		await host.waitForTimeout(3_000);
		await expect(podium).toBeVisible();
		await expect(host).toHaveURL(/\/host\//);
	});
});
