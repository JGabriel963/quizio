import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	HostGameData,
	HostQuestionData,
	HostStageData,
} from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GameFinished } from "./game-finished";
import {
	ADVANCE_RETRY_MS,
	HostStage,
	type HostStageActions,
} from "./host-stage";

const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

/** `correct` is what the server sends: null until the results. */
function capitals(correct: (boolean | null)[]): HostQuestionData {
	return {
		type: "quiz",
		selection: "single",
		text: "Qual é a capital do Brasil?",
		choices: ["Rio de Janeiro", "Salvador", "Brasília", "Recife"].map(
			(text, index) => ({
				id: `choice-${index + 1}`,
				shapeIndex: index,
				text,
				correct: correct[index] ?? null,
			}),
		),
		image: null,
	};
}
const hidden = [null, null, null, null];
const revealed = [false, false, true, false];

function stageAt(overrides: Partial<HostStageData>): HostStageData {
	return {
		questionIndex: 0,
		phase: "answering",
		remainingMs: 20_000,
		durationMs: 20_000,
		question: capitals(hidden),
		answerCount: 0,
		distribution: null,
		...overrides,
	};
}

const game: HostGameData = {
	gameId: "game-1",
	quizId: "quiz-1",
	title: "Capitais",
	pin: "265914",
	status: "playing",
	endReason: null,
	locked: false,
	players: [
		{ id: "p1", nickname: "Ana" },
		{ id: "p2", nickname: "Bia" },
	],
	questionCount: 10,
	stage: null,
};

function renderStage(
	stage: HostStageData,
	options: { advance?: HostStageActions["advance"]; receivedAt?: number } = {},
) {
	const actions: HostStageActions = {
		advance: options.advance ?? vi.fn(async () => {}),
		end: vi.fn(),
	};
	const user = userEvent.setup(
		vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : undefined,
	);
	render(
		<HostStage
			game={{ ...game, stage }}
			stage={stage}
			receivedAt={options.receivedAt ?? Date.now()}
			actions={actions}
		/>,
	);
	return { actions, user };
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const choices = () =>
	within(screen.getByRole("list", { name: "Respostas" })).getAllByRole(
		"listitem",
	);

afterEach(() => {
	vi.useRealTimers();
});

describe("HostStage: openings (spec 009)", () => {
	it("opens the game with the quiz title, then asks for the first question", async () => {
		vi.useFakeTimers();
		const { actions } = renderStage(
			stageAt({
				phase: "gameIntro",
				remainingMs: 3_000,
				durationMs: 3_000,
				question: null,
			}),
		);

		expect(screen.getByRole("heading", { name: "Capitais" })).toBeVisible();
		await tick(2_900);
		expect(actions.advance).not.toHaveBeenCalled();

		await tick(100);
		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "gameIntro" },
			false,
		);
	});

	it("shows the type, the question and its position, without the answers", () => {
		renderStage(
			stageAt({
				questionIndex: 1,
				phase: "questionIntro",
				remainingMs: 5_000,
				durationMs: 5_000,
			}),
		);

		expect(screen.getByText("Quiz")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Qual é a capital do Brasil?" }),
		).toBeVisible();
		expect(
			document.querySelector('[data-slot="question-position"]'),
		).toHaveTextContent("2/10");
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
		expect(screen.queryByText("Brasília")).toBeNull();
	});

	it("asks for the answers when the intro's time is up", async () => {
		vi.useFakeTimers();
		// The host reloaded two seconds ago with three left.
		const { actions } = renderStage(
			stageAt({
				phase: "questionIntro",
				remainingMs: 3_000,
				durationMs: 5_000,
			}),
			{ receivedAt: Date.now() - 2_000 },
		);

		await tick(900);
		expect(actions.advance).not.toHaveBeenCalled();
		await tick(100);
		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "questionIntro" },
			false,
		);
	});

	it("asks again when the server says it is too early, and gives up on anything else", async () => {
		vi.useFakeTimers();
		const advance = vi
			.fn<HostStageActions["advance"]>()
			.mockRejectedValueOnce(refusal("GAME.STAGE_NOT_DUE"))
			.mockRejectedValueOnce(refusal("GAME.ENDED"));
		renderStage(stageAt({ phase: "questionIntro", remainingMs: 1_000 }), {
			advance,
		});

		await tick(1_000);
		expect(advance).toHaveBeenCalledTimes(1);
		await tick(ADVANCE_RETRY_MS);
		expect(advance).toHaveBeenCalledTimes(2);
		await tick(ADVANCE_RETRY_MS * 4);
		expect(advance).toHaveBeenCalledTimes(2);
	});
});

describe("HostStage: answers (spec 009)", () => {
	it("shows the question, the answers, the time left and the total of answers", () => {
		renderStage(stageAt({ remainingMs: 12_000, answerCount: 1 }));

		expect(
			screen.getByRole("heading", { name: "Qual é a capital do Brasil?" }),
		).toBeVisible();
		expect(
			screen.getByRole("timer", { name: "Tempo restante" }),
		).toHaveTextContent("12");
		expect(
			document.querySelector('[data-slot="answer-count"]'),
		).toHaveTextContent("1");
		expect(screen.getByText("resposta")).toBeVisible();
		expect(choices().map((item) => item.textContent)).toEqual([
			"Rio de Janeiro",
			"Salvador",
			"Brasília",
			"Recife",
		]);
		expect(choices().map((item) => item.dataset.shape)).toEqual([
			"triangle",
			"diamond",
			"circle",
			"square",
		]);
		// Nothing tells the right answer before the results.
		expect(choices().every((item) => item.dataset.state === "idle")).toBe(true);
		expect(
			screen.queryByRole("list", { name: "Distribuição das respostas" }),
		).toBeNull();
	});

	it("counts the time down and asks for the results at the end", async () => {
		vi.useFakeTimers();
		const { actions } = renderStage(stageAt({ remainingMs: 20_000 }));
		const timer = screen.getByRole("timer", { name: "Tempo restante" });

		await tick(5_000);
		expect(timer).toHaveTextContent("15");
		expect(actions.advance).not.toHaveBeenCalled();

		await tick(15_000);
		expect(timer).toHaveTextContent("0");
		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "answering" },
			false,
		);
	});

	it("skips the timer", async () => {
		const { actions, user } = renderStage(stageAt({ questionIndex: 2 }));

		await user.click(
			screen.getByRole("button", { name: "Pular o cronômetro" }),
		);

		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 2, phase: "answering" },
			true,
		);
	});

	it("shows only the answers the question has, each with its own shape", () => {
		const question = capitals(hidden);
		renderStage(
			stageAt({
				question: {
					...question,
					choices: question.choices.filter((choice) => choice.shapeIndex !== 2),
				},
			}),
		);

		expect(choices().map((item) => item.dataset.shape)).toEqual([
			"triangle",
			"diamond",
			"square",
		]);
	});

	it("shows six answers", () => {
		renderStage(
			stageAt({
				question: {
					...capitals(hidden),
					choices: ["a", "b", "c", "d", "e", "f"].map((text, index) => ({
						id: `choice-${index + 1}`,
						shapeIndex: index,
						text,
						correct: null,
					})),
				},
			}),
		);

		expect(choices()).toHaveLength(6);
		expect(choices().at(-1)?.dataset.shape).toBe("inverted-triangle");
	});
});

describe("HostStage: results (spec 009)", () => {
	const results = stageAt({
		phase: "results",
		remainingMs: null,
		durationMs: null,
		question: capitals(revealed),
		answerCount: 4,
		distribution: [
			{ choiceId: "choice-1", count: 1 },
			{ choiceId: "choice-2", count: 0 },
			{ choiceId: "choice-3", count: 3 },
			{ choiceId: "choice-4", count: 0 },
		],
	});
	const bars = () =>
		within(
			screen.getByRole("list", { name: "Distribuição das respostas" }),
		).getAllByRole("listitem");

	it("shows a bar per answer with its count, and marks the right one", () => {
		renderStage(results);

		expect(
			bars().map(
				(bar) =>
					bar.querySelector('[data-slot="answer-bar-count"]')?.textContent,
			),
		).toEqual(["1", "0", "3", "0"]);
		expect(bars().map((bar) => bar.dataset.correct)).toEqual([
			"false",
			"false",
			"true",
			"false",
		]);
		expect(bars()[2]).toHaveAccessibleName("Brasília: 3 respostas");
		expect(choices().map((item) => item.dataset.state)).toEqual([
			"incorrect",
			"incorrect",
			"correct",
			"incorrect",
		]);
		expect(choices()[2]).toHaveTextContent("Resposta correta");
	});

	it("marks the right answer even when nobody chose it", () => {
		renderStage({
			...results,
			distribution: [
				{ choiceId: "choice-1", count: 2 },
				{ choiceId: "choice-2", count: 0 },
				{ choiceId: "choice-3", count: 0 },
				{ choiceId: "choice-4", count: 0 },
			],
		});

		expect(bars()[2]?.dataset.correct).toBe("true");
		expect(bars()[2]).toHaveAccessibleName("Brasília: 0 respostas");
	});

	it("shows true/false as two bars, with the right one marked", () => {
		renderStage({
			...results,
			question: {
				type: "trueFalse",
				selection: "single",
				text: "A capital do Brasil é o Rio de Janeiro",
				choices: [
					{ id: "true", shapeIndex: 1, text: "Verdadeiro", correct: false },
					{ id: "false", shapeIndex: 0, text: "Falso", correct: true },
				],
				image: null,
			},
			distribution: [
				{ choiceId: "true", count: 1 },
				{ choiceId: "false", count: 3 },
			],
		});

		expect(bars()).toHaveLength(2);
		expect(bars()[1]).toHaveAccessibleName("Falso: 3 respostas");
		expect(bars().map((bar) => bar.dataset.correct)).toEqual(["false", "true"]);
		expect(choices().map((item) => item.dataset.shape)).toEqual([
			"diamond",
			"triangle",
		]);
	});

	it("waits for the host, who advances", async () => {
		vi.useFakeTimers();
		const { actions } = renderStage(results);

		await tick(120_000);
		expect(actions.advance).not.toHaveBeenCalled();

		vi.useRealTimers();
		await userEvent.click(screen.getByRole("button", { name: "Avançar" }));

		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "results" },
			false,
		);
	});
});

describe("HostStage: image and header (spec 009)", () => {
	const image = {
		url: "https://media.test/mapa.png",
		placement: "media" as const,
		crop: { shape: "square" as const, zoom: 1, x: 0.5, y: 0.5 },
		altText: "Mapa do Brasil",
	};

	it("shows the image in the middle, with its crop", () => {
		renderStage(stageAt({ question: { ...capitals(hidden), image } }));

		expect(screen.getByRole("img", { name: "Mapa do Brasil" })).toHaveAttribute(
			"src",
			image.url,
		);
		expect(
			document.querySelector('[data-slot="question-image"]'),
		).toHaveAttribute("data-crop", "square");
		expect(document.querySelector('[data-slot="stage-background"]')).toBeNull();
	});

	it("shows a background image behind the whole screen", () => {
		renderStage(
			stageAt({
				question: {
					...capitals(hidden),
					image: { ...image, placement: "background", altText: null },
				},
			}),
		);

		const background = document.querySelector('[data-slot="stage-background"]');
		expect(
			within(background as HTMLElement).getByRole("img", {
				name: "Imagem da pergunta",
			}),
		).toHaveAttribute("src", image.url);
		expect(document.querySelector('[data-slot="question-image"]')).toBeNull();
	});

	it("keeps the player count and ends the game after confirming", async () => {
		const { actions, user } = renderStage(stageAt({}));

		expect(
			document.querySelector('[data-slot="player-count"]'),
		).toHaveTextContent("2");
		await user.click(screen.getByRole("button", { name: "Sair" }));
		expect(actions.end).not.toHaveBeenCalled();

		await user.click(
			within(
				screen.getByRole("alertdialog", { name: "Encerrar o jogo?" }),
			).getByRole("button", { name: "Encerrar" }),
		);

		expect(actions.end).toHaveBeenCalledTimes(1);
	});
});

describe("GameFinished (spec 009)", () => {
	it("says the game is over and leads back to the quiz", async () => {
		renderWithRouter(<GameFinished title="Capitais" quizId="quiz-1" />);

		expect(
			await screen.findByRole("heading", { name: "Fim do jogo" }),
		).toBeVisible();
		expect(screen.getByText("Capitais")).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Voltar ao quiz" }),
		).toHaveAttribute("href", "/quizzes/quiz-1");
	});
});
