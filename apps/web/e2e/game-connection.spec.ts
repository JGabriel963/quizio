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
/** The host counts as away after 10 s of silence; the phone asks about then. */
const HOST_AWAY = { timeout: 25_000 };
/** A lost connection is tried again every 5 s. */
const RECONNECT = { timeout: 15_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const connectionLost = (host: Page) =>
	host.getByRole("alertdialog", { name: "Conexão perdida" });
const connectionBar = (player: Page) =>
	player.locator('[data-slot="connection-bar"]');
const answerButtons = (player: Page) =>
	player.locator('[data-slot="answer-button"]');
const stageAnswers = (host: Page) =>
	host.getByRole("list", { name: "Respostas" }).getByRole("listitem");
const distribution = (host: Page) =>
	host.getByRole("list", { name: "Distribuição das respostas" });
const waiting = (player: Page) =>
	player.getByText("Pronto! Está vendo seu apelido na tela?");

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

/** Hosts the quiz just published; returns the PIN. */
async function host(page: Page) {
	await readyDialog(page)
		.getByRole("button", { name: /Organizar ao vivo/ })
		.click();
	return lobbyPin(page);
}

async function join(player: Page, pin: string, nickname: string) {
	await player.goto(`/join/${pin}`);
	await enterNickname(player, nickname);
	await expect(waiting(player)).toBeVisible();
}

test.describe("robustez da partida (spec 013)", () => {
	test("encerrar pelo painel de configurações manda os jogadores de volta ao PIN", async ({
		page,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(page);
		await publishQuiz(page, "Capitais");
		const ana = await newParticipant(browser);
		const pin = await host(page);
		await join(ana, pin, "Ana");
		await page.getByRole("button", { name: "Iniciar" }).click();
		await expect(answerButtons(ana)).toHaveCount(2, NEXT_PHASE);

		// CA-01 to CA-03: the panel's last line asks first, and cancelling goes back to it.
		await page.getByRole("button", { name: "Configurações" }).click();
		const settings = page.getByRole("dialog", { name: "Configurações" });
		await expect(settings).toContainText("Encerrar jogo");
		await settings.getByRole("button", { name: "Encerrar agora" }).click();
		const confirmation = page.getByRole("alertdialog", {
			name: "Encerrar o jogo?",
		});
		await confirmation.getByRole("button", { name: "Cancelar" }).click();
		await expect(confirmation).toHaveCount(0);
		await expect(settings).toBeVisible();

		await settings.getByRole("button", { name: "Encerrar agora" }).click();
		await confirmation.getByRole("button", { name: "Encerrar" }).click();

		// CA-02, CA-04: no podium; the player is back at the PIN.
		await expect(page).toHaveURL(/\/quizzes\//);
		await expect(ana.getByRole("alert")).toHaveText(
			"O anfitrião encerrou o jogo.",
		);
		await expect(ana.getByRole("textbox", { name: "PIN" })).toBeVisible();
		await ana.getByRole("textbox", { name: "PIN" }).fill(pin);
		await ana.getByRole("button", { name: "Entrar" }).click();
		await expect(ana.getByRole("alert")).toContainText(
			"Não foi possível reconhecer o PIN do jogo.",
		);
	});

	test("anfitrião sem conexão: o aviso, a entrada de um jogador nesse meio-tempo e a pergunta que venceu", async ({
		page,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(page);
		await publishQuiz(page, "Capitais");
		const ana = await newParticipant(browser);
		const bia = await newParticipant(browser);
		const pin = await host(page);
		await join(ana, pin, "Ana");

		// CA-05, CA-09: offline in the lobby, the dialog shows and cannot be closed.
		await page.context().setOffline(true);
		await expect(connectionLost(page)).toBeVisible(RECONNECT);
		await expect(connectionLost(page)).toContainText(
			"O jogo continua de onde parou assim que a conexão voltar.",
		);
		await expect(connectionLost(page).getByRole("status")).toContainText(
			/Tentando novamente em \d segundos?…|Reconectando…/,
		);
		await page.keyboard.press("Escape");
		await expect(connectionLost(page)).toBeVisible();

		// CA-14: a player gets in meanwhile; CA-18, CA-24: the phones tell the host is gone.
		await join(bia, pin, "Bia");
		await expect(connectionBar(ana)).toContainText(
			"O anfitrião se desconectou",
			HOST_AWAY,
		);

		// CA-08, CA-20: back, the dialog closes by itself and the phones follow.
		// ("Reconectar" is in the component's tests: here the browser coming
		// online already tries at once, and the button is gone before a click.)
		await expect(
			connectionLost(page).getByRole("button", { name: "Reconectar" }),
		).toBeVisible();
		await page.context().setOffline(false);
		await expect(connectionLost(page)).toHaveCount(0, RECONNECT);
		await expect(page.locator('[data-slot="player-count"]')).toHaveText("2");
		await expect(connectionBar(ana)).toHaveCount(0, RECONNECT);
		await expect(connectionBar(bia)).toHaveCount(0, RECONNECT);

		// CA-12, CA-13: the answers' time runs out with the host offline.
		await page.getByRole("button", { name: "Iniciar" }).click();
		await expect(stageAnswers(page)).toHaveCount(2, NEXT_PHASE);
		await expect(answerButtons(ana)).toHaveCount(2);
		await page.context().setOffline(true);
		await expect(connectionLost(page)).toBeVisible(RECONNECT);
		await ana.getByRole("button", { name: "Triângulo vermelho" }).click();
		await expect(answerButtons(ana)).toHaveCount(0);
		// 20 s of the question, and then some.
		await page.waitForTimeout(22_000);
		await expect(connectionBar(bia)).toContainText(
			"O anfitrião se desconectou",
		);

		await page.context().setOffline(false);
		await expect(connectionLost(page)).toHaveCount(0, RECONNECT);
		// The screen goes straight to the results, and Ana's answer counted.
		await expect(distribution(page)).toBeVisible(NEXT_PHASE);
		await expect(connectionBar(ana)).toHaveCount(0, RECONNECT);
		await expect(ana.getByRole("heading", { name: "Correto" })).toBeVisible(
			NEXT_PHASE,
		);
		await expect(
			ana.getByRole("heading", { name: "Tempo esgotado" }),
		).toHaveCount(0);
		await expect(
			bia.getByRole("heading", { name: "Tempo esgotado" }),
		).toBeVisible(NEXT_PHASE);
	});

	test("fechar a aba do anfitrião mostra a barra no celular, e reabrir a tira", async ({
		page,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(page);
		await publishQuiz(page, "Capitais");
		const ana = await newParticipant(browser);
		const pin = await host(page);
		const gameUrl = page.url();
		await join(ana, pin, "Ana");

		// CA-19: with the host there, no bar.
		await ana.waitForTimeout(6_000);
		await expect(connectionBar(ana)).toHaveCount(0);

		// CA-21: the tab is gone (the browser's own question is answered).
		page.on("dialog", (dialog) => void dialog.accept());
		await page.goto("about:blank");
		await expect(connectionBar(ana)).toContainText(
			"O anfitrião se desconectou",
			HOST_AWAY,
		);
		await expect(connectionBar(ana)).toContainText("Conexão perdida");
		await expect(waiting(ana)).toBeVisible();

		// CA-23: "Sair" leads to the PIN, still a player of the game.
		// By the keyboard: on a phone's width the development tools' floating
		// button sits over the corner of the bar and would take the click.
		await ana.getByRole("button", { name: "Sair" }).press("Enter");
		await expect(ana).toHaveURL(/\/join$/);
		const back = ana.getByRole("button", { name: "Voltar como Ana" });
		await expect(back).toBeVisible();

		await page.goto(gameUrl);
		await expect(page.locator('[data-slot="player-count"]')).toHaveText("1");
		await back.click();
		await expect(waiting(ana)).toBeVisible();
		await expect(connectionBar(ana)).toHaveCount(0, RECONNECT);
	});

	test("celular sem conexão: avisa, não envia a resposta e volta sozinho como o mesmo jogador", async ({
		page,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(page);
		await publishQuiz(page, "Capitais");
		const ana = await newParticipant(browser);
		const pin = await host(page);
		await join(ana, pin, "Ana");
		await page.getByRole("button", { name: "Iniciar" }).click();
		await expect(answerButtons(ana)).toHaveCount(2, NEXT_PHASE);

		// CA-26, CA-29: offline, the bar shows and the answer is not sent.
		await ana.context().setOffline(true);
		await expect(connectionBar(ana)).toContainText("Tentando reconectar…");
		await ana.getByRole("button", { name: "Triângulo vermelho" }).click();
		await expect(ana.getByRole("alert")).toHaveText(
			"Sua resposta não foi enviada.",
			RECONNECT,
		);
		await expect(answerButtons(ana)).toHaveCount(2);
		await expect(page.locator('[data-slot="answer-count"]')).toHaveText("0");

		// CA-28, CA-30: back by itself, the answer goes through.
		await ana.context().setOffline(false);
		await expect(connectionBar(ana)).toHaveCount(0, RECONNECT);
		await ana.getByRole("button", { name: "Triângulo vermelho" }).click();
		await expect(answerButtons(ana)).toHaveCount(0);
		// Everybody answered: the results come, on both screens.
		await expect(distribution(page)).toBeVisible(NEXT_PHASE);
		await expect(ana.getByRole("heading", { name: "Correto" })).toBeVisible(
			NEXT_PHASE,
		);
	});
});
