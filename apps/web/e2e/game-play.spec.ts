import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	pickNewQuestionType,
	signUp,
} from "./support";

/** A phase lasts up to 5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 15_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const notice = (page: Page) => page.getByRole("alert");
const heading = (page: Page, name: string) =>
	page.getByRole("heading", { name, exact: true });
const position = (host: Page) =>
	host.locator('[data-slot="question-position"]');
const answerCount = (host: Page) => host.locator('[data-slot="answer-count"]');
const timeLeft = (host: Page) => host.locator('[data-slot="time-left"]');
const stageAnswers = (host: Page) =>
	host.getByRole("list", { name: "Respostas" }).getByRole("listitem");
const bars = (host: Page) =>
	host
		.getByRole("list", { name: "Distribuição das respostas" })
		.getByRole("listitem");
const scoreboard = (host: Page) =>
	host.getByRole("list", { name: "Placar" }).getByRole("listitem");
const playerTotal = (player: Page) =>
	player.locator('[data-slot="player-total"]');
const answerButtons = (player: Page) =>
	player.locator('[data-slot="answer-button"]');
const answerButton = (player: Page, name: string) =>
	player.getByRole("button", { name, exact: true });

/**
 * A playable quiz of two questions, the first a Quiz of two answers and the
 * second a true/false one, both with the default 20 seconds.
 */
async function publishTwoQuestionQuiz(page: Page, title: string) {
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

	const listToggle = page.getByRole("button", { name: "Lista de perguntas" });
	if (await listToggle.isVisible()) {
		await listToggle.click();
	}
	await pickNewQuestionType(page, "Verdadeiro ou falso");
	const question = page.getByRole("textbox", { name: "Pergunta" });
	await expect(question).toHaveValue("");
	await question.fill("Brasília é a capital do Brasil");
	await question.blur();
	await page.getByRole("checkbox", { name: "Verdadeiro correta" }).click();
	await expectSaved(page);

	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

/** Hosts the quiz just published and brings the players in. */
async function hostWithPlayers(
	host: Page,
	players: { page: Page; nickname: string }[],
) {
	await readyDialog(host)
		.getByRole("button", { name: /Organizar ao vivo/ })
		.click();
	const pin = await lobbyPin(host);
	for (const { page, nickname } of players) {
		await page.goto(`/join/${pin}`);
		await enterNickname(page, nickname);
		await expect(
			page.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();
	}
	await expect(host.locator('[data-slot="player-count"]')).toHaveText(
		String(players.length),
	);
	return pin;
}

test.describe("ciclo da pergunta (spec 009)", () => {
	test("uma partida do início ao fim, com dois jogadores", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(host);
		await publishTwoQuestionQuiz(host, "Capitais");
		const ana = await newParticipant(browser);
		const bia = await newParticipant(browser);
		// The phones' numbers count up (spec 011): with reduced motion they show
		// at once, so the test reads the points and not a frame of the count.
		// The host's screen keeps its animations.
		await ana.emulateMedia({ reducedMotion: "reduce" });
		await bia.emulateMedia({ reducedMotion: "reduce" });
		const pin = await hostWithPlayers(host, [
			{ page: ana, nickname: "Ana" },
			{ page: bia, nickname: "Bia" },
		]);

		// CA-01: Iniciar opens the game on the three screens.
		await host.getByRole("button", { name: "Iniciar" }).click();
		await expect(heading(host, "Capitais")).toBeVisible();
		await expect(heading(ana, "Prepare-se!")).toBeVisible();
		await expect(heading(bia, "Prepare-se!")).toBeVisible();

		// CA-04: nobody new gets in once it started.
		const late = await newParticipant(browser);
		await late.goto(`/join/${pin}`);
		await expect(notice(late)).toHaveText("Este jogo já começou.");

		// The intro of question 1: the question without its answers.
		await expect(position(host)).toHaveText("1/2", NEXT_PHASE);
		await expect(heading(host, "Capital do Brasil?")).toBeVisible();
		await expect(host.getByRole("list", { name: "Respostas" })).toHaveCount(0);
		await expect(heading(ana, "Pergunta 1")).toBeVisible();
		await expect(ana.getByText("Preparar…")).toBeVisible();
		await expect(answerButtons(ana)).toHaveCount(0);

		// The answers open: texts on the host, colors and shapes on the phones.
		await expect(stageAnswers(host)).toHaveText(
			["Brasília", "Rio de Janeiro"],
			NEXT_PHASE,
		);
		await expect(answerCount(host)).toHaveText("0");
		await expect(answerButtons(ana)).toHaveCount(2);
		await expect(ana.getByText("Brasília")).toHaveCount(0);
		// CA-44: the buttons fill the phone, with nothing to scroll.
		expect(
			await ana.evaluate(() => {
				const page = document.documentElement;
				return (
					page.scrollWidth <= page.clientWidth &&
					page.scrollHeight <= page.clientHeight
				);
			}),
		).toBe(true);

		// CA-10: an answer goes in, and the player does not know how it went.
		await answerButton(ana, "Triângulo vermelho").click();
		await expect(ana.getByText("Resposta recebida!")).toBeVisible();
		await expect(answerCount(host)).toHaveText("1");

		// CA-39: a reload keeps who answered waiting, and who did not, answering.
		await ana.reload();
		await expect(ana.getByText("Resposta recebida!")).toBeVisible();
		await expect(answerButtons(ana)).toHaveCount(0);
		await bia.reload();
		await expect(answerButtons(bia)).toHaveCount(2);

		// CA-24: the last answer brings the results, without waiting for the time.
		await answerButton(bia, "Losango azul").click();
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible();
		await expect(
			bars(host).locator('[data-slot="answer-bar-count"]'),
		).toHaveText(["1", "1"]);
		await expect(bars(host).first()).toHaveAttribute("data-correct", "true");
		// CA-30: each player learns only how they did.
		await expect(heading(ana, "Correto")).toBeVisible();
		await expect(heading(bia, "Incorreto")).toBeVisible();
		await expect(bia.getByText("Brasília")).toHaveCount(0);

		// Spec 010, CA-14, CA-16: points, streak, place and the total in the footer.
		const anaPoints = ana.locator('[data-slot="answer-points"]');
		await expect(anaPoints).toHaveText(/^\+ \d{3,4}$/);
		const firstPoints = Number((await anaPoints.textContent())?.slice(2));
		expect(firstPoints).toBeGreaterThanOrEqual(500);
		expect(firstPoints).toBeLessThanOrEqual(1000);
		await expect(ana.locator('[data-slot="answer-streak"]')).toHaveText("1");
		await expect(ana.getByText("Você está no pódio!")).toBeVisible();
		await expect(playerTotal(ana)).toHaveText(String(firstPoints));
		await expect(bia.locator('[data-slot="answer-points"]')).toHaveCount(0);
		await expect(playerTotal(bia)).toHaveText("0");

		// Spec 010, CA-20, CA-22, CA-25: the scoreboard comes before the next question.
		await host.getByRole("button", { name: "Avançar" }).click();
		await expect(scoreboard(host)).toHaveText([
			new RegExp(`^Ana${firstPoints}$`),
			/^Bia0$/,
		]);
		await expect(host.locator('[data-slot="scoreboard-climbed"]')).toHaveCount(
			0,
		);
		// The phones keep the result while the host shows the scoreboard.
		await expect(heading(ana, "Correto")).toBeVisible();
		await expect(anaPoints).toBeVisible();

		// Spec 010, CA-28: the scoreboard survives a reload.
		await host.reload();
		await expect(scoreboard(host)).toHaveCount(2);

		// CA-34: Avançar opens the next question on the three screens.
		await host.getByRole("button", { name: "Avançar" }).click();
		await expect(position(host)).toHaveText("2/2");
		await expect(heading(ana, "Pergunta 2")).toBeVisible();
		await expect(heading(bia, "Pergunta 2")).toBeVisible();

		// True/false: two buttons, the blue one (Verdadeiro) first.
		await expect(stageAnswers(host)).toHaveText(
			["Verdadeiro", "Falso"],
			NEXT_PHASE,
		);
		await expect(answerButtons(bia)).toHaveCount(2);
		await expect(answerButton(bia, "Falso")).toBeVisible();
		await answerButton(bia, "Verdadeiro").click();
		await expect(answerCount(host)).toHaveText("1");
		// Spec 010, CA-18: the total does not move before the results.
		await expect(playerTotal(bia)).toHaveText("0");
		await expect(playerTotal(ana)).toHaveText(String(firstPoints));

		// CA-41: a reload shows the time that is really left, not the whole time.
		await expect(timeLeft(host)).not.toHaveText(/^(20|19|18)$/);
		await host.reload();
		await expect(timeLeft(host)).toBeVisible();
		const left = Number(await timeLeft(host).textContent());
		expect(left).toBeGreaterThan(0);
		expect(left).toBeLessThan(18);
		await expect(answerCount(host)).toHaveText("1");

		// CA-25: skipping the timer reveals; who did not answer ran out of time.
		await host.getByRole("button", { name: "Pular o cronômetro" }).click();
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible();
		await expect(heading(bia, "Correto")).toBeVisible();
		await expect(heading(ana, "Tempo esgotado")).toBeVisible();
		await expect(ana.getByText("Ainda não acabou!")).toBeVisible();
		// Ana missed: no points, no streak, and the total stays.
		await expect(ana.locator('[data-slot="answer-points"]')).toHaveCount(0);
		await expect(playerTotal(ana)).toHaveText(String(firstPoints));

		// CA-40 (and spec 010, CA-19): a reload at the results shows it all again.
		const biaPoints = bia.locator('[data-slot="answer-points"]');
		await expect(biaPoints).toHaveText(/^\+ \d{3,4}$/);
		const secondPoints = Number((await biaPoints.textContent())?.slice(2));
		await bia.reload();
		await expect(heading(bia, "Correto")).toBeVisible();
		await expect(biaPoints).toHaveText(`+ ${secondPoints}`);
		await expect(playerTotal(bia)).toHaveText(String(secondPoints));

		// Spec 011, CA-01: the last results lead straight to the podium, with no
		// scoreboard, and the phones wait for the reveal.
		await host.getByRole("button", { name: "Avançar" }).click();
		await expect(heading(host, "Capitais")).toBeVisible();
		await expect(host.getByRole("list", { name: "Placar" })).toHaveCount(0);
		await expect(ana.getByText("Rufem os tambores…")).toBeVisible();
		await expect(bia.getByText("Rufem os tambores…")).toBeVisible();

		// The PIN is free as soon as the game finishes.
		await late.goto(`/join/${pin}`);
		await expect(notice(late)).toHaveText(
			"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
		);

		// CA-06, CA-08: two players, so the third step stays empty.
		const biaWins = secondPoints > firstPoints;
		const winner = biaWins
			? { page: bia, nickname: "Bia", points: secondPoints }
			: { page: ana, nickname: "Ana", points: firstPoints };
		const runnerUp = biaWins
			? { page: ana, nickname: "Ana", points: firstPoints }
			: { page: bia, nickname: "Bia", points: secondPoints };
		const step = (place: number) =>
			host.locator(`[data-slot="podium-step"][data-place="${place}"]`);
		const onStep = (place: number) =>
			step(place).locator('[data-slot="podium-player"]');
		await expect(onStep(2)).toHaveText(runnerUp.nickname, NEXT_PHASE);
		await expect(onStep(1)).toHaveText(winner.nickname, NEXT_PHASE);
		await expect(step(1).locator('[data-slot="podium-total"]')).toHaveText(
			String(winner.points),
		);
		await expect(step(2).locator('[data-slot="podium-total"]')).toHaveText(
			String(runnerUp.points),
		);
		await expect(onStep(3)).toHaveCount(0);

		// CA-20 to CA-22: each phone shows its place and its total.
		await expect(heading(winner.page, "Imbatível!")).toBeVisible(NEXT_PHASE);
		await expect(heading(runnerUp.page, "Por pouco!")).toBeVisible();
		await expect(winner.page.locator('[data-slot="quiz-title"]')).toHaveText(
			"Capitais",
		);
		await expect(playerTotal(winner.page)).toHaveText(String(winner.points));
		await expect(playerTotal(runnerUp.page)).toHaveText(
			String(runnerUp.points),
		);

		// CA-24: a reload shows the final screen again, without the wait.
		await winner.page.reload();
		await expect(heading(winner.page, "Imbatível!")).toBeVisible();
		await expect(winner.page.getByText("Rufem os tambores…")).toHaveCount(0);

		// CA-13: the podium survives a reload of the host's screen, whole.
		await host.reload();
		await expect(onStep(1)).toHaveText(winner.nickname);
		await expect(onStep(2)).toHaveText(runnerUp.nickname);

		// CA-16: the full standings, and back to the podium.
		await host.getByRole("button", { name: "Classificação" }).click();
		await expect(
			host
				.getByRole("list", { name: "Classificação final" })
				.getByRole("listitem"),
		).toHaveText([
			new RegExp(`^1º${winner.nickname}.*${winner.points}$`),
			new RegExp(`^2º${runnerUp.nickname}.*${runnerUp.points}$`),
		]);
		await host.getByRole("button", { name: "Voltar ao pódio" }).click();
		await expect(onStep(1)).toHaveText(winner.nickname);

		// CA-25: the player leaves the final screen for another game.
		await runnerUp.page
			.getByRole("button", { name: "Entrar em outro jogo" })
			.click();
		await expect(
			runnerUp.page.getByRole("textbox", { name: "PIN" }),
		).toBeVisible();

		// CA-17: "Jogar novamente" opens a new lobby of the same quiz, with
		// another PIN and nobody in it.
		await host.getByRole("button", { name: "Jogar novamente" }).click();
		await expect(host.locator('[data-slot="player-count"]')).toHaveText("0");
		expect(await lobbyPin(host)).not.toBe(pin);
	});

	test("o tempo acaba sozinho, e o anfitrião encerra no meio do jogo", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(host);
		await publishTwoQuestionQuiz(host, "Geografia");
		const player = await newParticipant(browser);
		await hostWithPlayers(host, [{ page: player, nickname: "ACT" }]);

		await host.getByRole("button", { name: "Iniciar" }).click();
		await expect(stageAnswers(host)).toHaveCount(2, NEXT_PHASE);

		// CA-23: nobody answers, and the 20 seconds reveal by themselves.
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible({
			timeout: 30_000,
		});
		await expect(heading(player, "Tempo esgotado")).toBeVisible();

		// CA-42: ending in the middle sends the host to the quiz and the player out.
		await host.getByRole("button", { name: "Sair" }).click();
		await host
			.getByRole("alertdialog", { name: "Encerrar o jogo?" })
			.getByRole("button", { name: "Encerrar" })
			.click();
		await expect(host).toHaveURL(/\/quizzes\//);
		await expect(notice(player)).toHaveText("O anfitrião encerrou o jogo.");
		await expect(player.getByRole("textbox", { name: "PIN" })).toBeVisible();
	});
});
