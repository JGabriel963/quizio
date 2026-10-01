import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const players = (host: Page) =>
	host.getByRole("list", { name: "Participantes" });
const playerCount = (host: Page) => host.locator('[data-slot="player-count"]');
const notice = (player: Page) => player.getByRole("alert");

/** A quiz with one complete question, saved as playable; ends on "O quiz está pronto". */
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

/**
 * The padlock shows the change at once; the test waits for the server, which
 * is what decides who gets in.
 */
async function toggleLock(host: Page, name: string) {
	const saved = host.waitForResponse(
		(response) => response.url().includes("game.setLocked") && response.ok(),
	);
	await host.getByRole("button", { name }).click();
	await saved;
}

async function expectWaiting(player: Page, nickname: string) {
	await expect(player.getByRole("heading", { name: nickname })).toBeVisible();
	await expect(
		player.getByText("Pronto! Está vendo seu apelido na tela?"),
	).toBeVisible();
}

test.describe("lobby da partida ao vivo (spec 008)", () => {
	test("organizar, entrar, remover, travar e encerrar", async ({
		page: host,
		browser,
		baseURL,
	}) => {
		await signUp(host);
		await publishQuiz(host, "Capitais");

		// CA-02: from "O quiz está pronto" to the lobby.
		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		await expect(host.getByText("Aguardando os participantes")).toBeVisible();
		await expect(playerCount(host)).toHaveText("0");
		await expect(host.getByRole("button", { name: /Iniciar/ })).toBeDisabled();

		// CA-35, CA-15: a player without an account joins by PIN and shows up.
		const act = await newParticipant(browser);
		await act.goto("/join");
		await act.getByRole("textbox", { name: "PIN" }).fill(pin);
		await act.getByRole("button", { name: "Entrar" }).click();
		await expect(act.getByText("Não use seu nome verdadeiro")).toBeVisible();
		await enterNickname(act, "ACT");
		await expectWaiting(act, "ACT");
		await expect(
			players(host).getByRole("button", { name: /ACT/ }),
		).toBeVisible();
		await expect(playerCount(host)).toHaveText("1");
		await expect(host.getByText("Aguardando os participantes")).toBeHidden();

		// CA-43: reloading keeps the player, without a second one.
		await act.reload();
		await expectWaiting(act, "ACT");

		// CA-13, CA-42: the join link skips the PIN; a nickname in use is refused.
		const bia = await newParticipant(browser);
		await bia.goto(`/join/${pin}`);
		await enterNickname(bia, "act");
		await expect(notice(bia)).toHaveText(
			"Esse apelido já está em uso. Escolha outro.",
		);
		await enterNickname(bia, "Bia");
		await expectWaiting(bia, "Bia");
		await expect(players(host).getByRole("button")).toHaveText([/ACT/, /Bia/]);

		// CA-17, CA-32: the lobby lives on the server.
		await host.reload();
		expect(await lobbyPin(host)).toBe(pin);
		await expect(playerCount(host)).toHaveText("2");

		// CA-14: the link to share.
		await expect(
			host.getByRole("button", { name: "Copiar link para compartilhar" }),
		).toBeVisible();
		expect(baseURL).toBeTruthy();

		// CA-25, CA-27: removing sends the player back to the PIN, nickname blocked.
		await players(host).getByRole("button", { name: /ACT/ }).click();
		await host
			.getByRole("alertdialog", { name: "Remover ACT?" })
			.getByRole("button", { name: "Remover" })
			.click();
		await expect(players(host).getByRole("button")).toHaveText([/Bia/]);
		await expect(notice(act)).toHaveText("Ah, não! Você foi expulso do jogo.");
		await expect(act).toHaveURL(/\/join$/);
		await act.getByRole("textbox", { name: "PIN" }).fill(pin);
		await act.getByRole("button", { name: "Entrar" }).click();
		await enterNickname(act, "ACT");
		await expect(notice(act)).toHaveText(
			"Esse apelido já está em uso. Escolha outro.",
		);

		// CA-21, CA-23: locked while the player was typing the nickname.
		await toggleLock(
			host,
			"Bloqueie o jogo para impedir que outros participantes entrem",
		);
		await expect(
			host.getByText("Jogo bloqueado: ninguém mais pode entrar"),
		).toBeVisible();
		await enterNickname(act, "ACT2");
		await expect(notice(act)).toHaveText(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);

		// CA-22: nobody gets in by the link either.
		const late = await newParticipant(browser);
		await late.goto(`/join/${pin}`);
		await expect(notice(late)).toHaveText(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);

		// CA-24: unlocking brings the same PIN back, and the player gets in.
		await toggleLock(
			host,
			"Desbloqueie o jogo para que outros participantes entrem",
		);
		expect(await lobbyPin(host)).toBe(pin);
		await enterNickname(act, "ACT2");
		await expectWaiting(act, "ACT2");

		// CA-30: ending tells the players and frees the PIN.
		await host.getByRole("button", { name: "Sair" }).click();
		await host
			.getByRole("alertdialog", { name: "Encerrar o jogo?" })
			.getByRole("button", { name: "Encerrar" })
			.click();
		await expect(host).toHaveURL(/\/quizzes\//);
		await expect(notice(bia)).toHaveText("O anfitrião encerrou o jogo.");
		await late.goto(`/join/${pin}`);
		await expect(notice(late)).toHaveText(
			"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
		);
	});

	test("organizar pela página do quiz e reabrir a partida", async ({
		page: host,
		browser,
	}) => {
		await signUp(host);

		// CA-03: a draft cannot be hosted.
		await createQuizInEditor(host);
		const draftUrl = host.url().replace("/creator/", "/quizzes/");
		await host.goto(draftUrl);
		await expect(
			host.getByRole("button", { name: "Organizar ao vivo" }),
		).toBeDisabled();
		await expect(
			host.getByText("Salve o quiz no editor para poder jogar."),
		).toBeVisible();

		// CA-01: from the quiz page to the lobby.
		await publishQuiz(host, "Geografia");
		const quizUrl = host.url().replace("/creator/", "/quizzes/");
		await readyDialog(host)
			.getByRole("button", { name: "Voltar para edição" })
			.click();
		await host.goto(quizUrl);
		await host.getByRole("button", { name: "Organizar ao vivo" }).click();
		const firstPin = await lobbyPin(host);
		const firstGameUrl = host.url();

		// CA-46: joining from a phone-sized screen has no sideways scroll.
		const player = await newParticipant(browser);
		await player.goto(`/join/${firstPin}`);
		await expect(
			player.getByRole("textbox", { name: "Apelido" }),
		).toBeVisible();
		expect(
			await player.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
		await enterNickname(player, "ACT");
		await expectWaiting(player, "ACT");

		// CA-08: hosting again replaces the open game.
		await host.goto(quizUrl);
		await host.getByRole("button", { name: "Organizar ao vivo" }).click();
		await expect(host).not.toHaveURL(firstGameUrl);
		const secondPin = await lobbyPin(host);
		expect(secondPin).not.toBe(firstPin);
		await expect(playerCount(host)).toHaveText("0");
		await expect(notice(player)).toHaveText("O anfitrião encerrou o jogo.");

		// CA-33: the replaced game says it ended.
		const secondGameUrl = host.url();
		await host.goto(firstGameUrl);
		await expect(
			host.getByRole("heading", { name: "Esta partida foi encerrada." }),
		).toBeVisible();

		// CA-18: the host's screen exists only for the host.
		const stranger = await newParticipant(browser);
		await signUp(stranger);
		await stranger.goto(secondGameUrl);
		await expect(
			stranger.getByRole("heading", { name: "Partida não encontrada" }),
		).toBeVisible();
	});
});
