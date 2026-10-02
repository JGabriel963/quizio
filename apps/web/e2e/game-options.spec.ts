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

const heading = (page: Page, name: string) =>
	page.getByRole("heading", { name, exact: true });
const settings = (host: Page) =>
	host.getByRole("dialog", { name: "Configurações" });
const stageAnswers = (host: Page) =>
	host.getByRole("list", { name: "Respostas" }).getByRole("listitem");
const answerButtons = (player: Page) =>
	player.locator('[data-slot="answer-button"]');
const answerButton = (player: Page, name: string) =>
	player.getByRole("button", { name, exact: true });

/** Which answer each shape holds, as the screen shows it. */
async function answersByShape(items: ReturnType<typeof stageAnswers>) {
	return Object.fromEntries(
		await items.evaluateAll((elements) =>
			elements.map((element) => [
				(element as HTMLElement).dataset.shape,
				element.textContent?.trim(),
			]),
		),
	);
}

/**
 * A playable quiz of two questions: a Quiz one with two right answers out of
 * three, which makes it a multiple selection, and a true/false one.
 */
async function publishQuiz(page: Page, title: string) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Quais já foram capitais do Brasil?");
	for (const [position, text] of ["Brasília", "Salvador", "Lima"].entries()) {
		const field = page.getByRole("textbox", {
			name: `Resposta ${position + 1}`,
			exact: true,
		});
		await field.fill(text);
		await field.blur();
	}
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
	await page.getByRole("checkbox", { name: "Resposta 2 correta" }).click();
	await expect(page.getByText("Múltipla escolha ativada")).toBeVisible();
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
	await expect(
		page.getByRole("dialog", { name: "O quiz está pronto" }),
	).toBeVisible();
}

test.describe("opções de jogo (spec 012)", () => {
	test("configurações, perguntas no celular, entrada no meio e múltipla escolha", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(host);
		await publishQuiz(host, "Capitais");
		const ana = await newParticipant(browser);
		const caio = await newParticipant(browser);
		await ana.emulateMedia({ reducedMotion: "reduce" });
		await caio.emulateMedia({ reducedMotion: "reduce" });

		await host
			.getByRole("dialog", { name: "O quiz está pronto" })
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		const shownPin = `${pin.slice(0, 3)} ${pin.slice(3)}`;
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		await expect(
			ana.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();

		// CA-01, CA-05: the panel opens in the lobby with everything off.
		await host.getByRole("button", { name: "Configurações" }).click();
		const switches = settings(host).getByRole("switch");
		await expect(switches).toHaveCount(4);
		for (const control of await switches.all()) {
			await expect(control).toHaveAttribute("aria-checked", "false");
		}
		await expect(settings(host)).toContainText(
			"Suas configurações serão salvas para a próxima vez.",
		);
		const onDevices = settings(host).getByRole("switch", {
			name: "Mostrar perguntas nos dispositivos",
		});
		const randomAnswers = settings(host).getByRole("switch", {
			name: "Mostrar respostas em ordem aleatória",
		});
		await onDevices.click();
		await randomAnswers.click();
		await expect(onDevices).toHaveAttribute("aria-checked", "true");
		await expect(randomAnswers).toHaveAttribute("aria-checked", "true");
		await settings(host).getByRole("button", { name: "Fechar" }).click();
		await expect(settings(host)).toHaveCount(0);

		// A reload shows what was saved.
		await host.reload();
		await host.getByRole("button", { name: "Configurações" }).click();
		await expect(onDevices).toHaveAttribute("aria-checked", "true");
		await expect(randomAnswers).toHaveAttribute("aria-checked", "true");

		// CA-07: a switch that cannot be saved goes back, with a notice.
		const randomQuestions = settings(host).getByRole("switch", {
			name: "Mostrar perguntas em ordem aleatória",
		});
		await host.route("**/api/trpc/game.setOptions**", (route) => route.abort());
		await randomQuestions.click();
		await expect(
			host.getByText(
				"Não foi possível salvar a configuração. Tente novamente.",
			),
		).toBeVisible();
		await expect(randomQuestions).toHaveAttribute("aria-checked", "false");
		await host.unroute("**/api/trpc/game.setOptions**");
		await settings(host).getByRole("button", { name: "Fechar" }).click();
		await expect(settings(host)).toHaveCount(0);

		await host.getByRole("button", { name: "Iniciar" }).click();

		// CA-22a: the intro of the question shows its statement on the phone.
		await expect(
			heading(ana, "Quais já foram capitais do Brasil?"),
		).toBeVisible(NEXT_PHASE);

		// CA-20, CA-27: the answers open with their texts on the phone, each
		// under the same shape as on the host's screen, whatever was drawn.
		await expect(stageAnswers(host)).toHaveCount(3, NEXT_PHASE);
		await expect(answerButtons(ana)).toHaveCount(3);
		await expect(
			ana.getByRole("timer", { name: "Tempo restante" }),
		).toBeVisible();
		const onHost = await answersByShape(stageAnswers(host));
		expect(Object.values(onHost).sort()).toEqual([
			"Brasília",
			"Lima",
			"Salvador",
		]);
		expect(await answersByShape(answerButtons(ana))).toEqual(onHost);
		// The phone scrolls down if it must, never sideways (CA-25).
		expect(
			await ana.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);

		// CA-10: the PIN stays in the header for who arrives late.
		const join = host
			.getByRole("banner")
			.getByRole("region", { name: "Como entrar" });
		await expect(join).toContainText(shownPin);

		// CA-01, CA-31: the panel opens during the game; the random orders are fixed.
		await host.getByRole("button", { name: "Configurações" }).click();
		await expect(
			settings(host).getByText("Só antes de iniciar a partida."),
		).toHaveCount(2);
		await expect(randomAnswers).toBeDisabled();
		await settings(host).getByRole("button", { name: "Fechar" }).click();
		await expect(settings(host)).toHaveCount(0);

		// CA-12: who joins with the answers open waits for the next question.
		await caio.goto(`/join/${pin}`);
		await enterNickname(caio, "Caio");
		await expect(heading(caio, "Você entrou!")).toBeVisible();
		await expect(caio.getByText("Aguarde a próxima pergunta.")).toBeVisible();
		await expect(answerButtons(caio)).toHaveCount(0);
		await expect(host.locator('[data-slot="player-count"]')).toHaveText("2");

		// CA-34: marking sends nothing.
		await expect(
			ana.getByText("Selecione uma ou mais respostas!"),
		).toBeVisible();
		await expect(ana.getByRole("button", { name: "Enviar" })).toBeDisabled();
		await answerButton(ana, "Brasília").click();
		await answerButton(ana, "Lima").click();
		await answerButton(ana, "Salvador").click();
		await answerButton(ana, "Lima").click();
		await expect(answerButton(ana, "Lima")).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		await expect(host.locator('[data-slot="answer-count"]')).toHaveText("0");

		// CA-35, CA-13: "Enviar" sends the two marked, and the results come
		// without waiting for who joined late.
		await ana.getByRole("button", { name: "Enviar" }).click();
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible();
		await expect(heading(ana, "Correto")).toBeVisible();
		await expect(heading(caio, "Você entrou!")).toBeVisible();
		await expect(caio.getByText("Tempo esgotado")).toHaveCount(0);

		// The next question is Caio's too, with its statement on the phone.
		await host.getByRole("button", { name: "Avançar" }).click();
		await host.getByRole("button", { name: "Avançar" }).click();
		await expect(heading(caio, "Brasília é a capital do Brasil")).toBeVisible(
			NEXT_PHASE,
		);
		await expect(answerButtons(caio)).toHaveCount(2, NEXT_PHASE);
		// CA-29: true/false is never shuffled.
		await expect(answerButtons(caio)).toHaveText(["Verdadeiro", "Falso"]);
		await answerButton(caio, "Verdadeiro").click();
		await expect(answerButtons(caio)).toHaveCount(0);
		await answerButton(ana, "Falso").click();

		// Who joined in the middle is graded like anybody else from then on.
		await expect(heading(caio, "Correto")).toBeVisible();
		await expect(heading(ana, "Incorreto")).toBeVisible();
	});
});
