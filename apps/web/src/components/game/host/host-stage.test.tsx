import {
	QUESTION_INTRO_MS,
	QUESTION_TYPE_REVEAL_MS,
} from "@quizio/core/game/domain/game-progress";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	HostGameData,
	HostQuestionData,
	HostStageData,
} from "@/lib/api-types";
import { GAME_MOTION } from "@/lib/game-motion";
import { stubReducedMotion } from "@/testing/reduced-motion";

import {
	ADVANCE_RETRY_MS,
	HostStage,
	type HostStageActions,
} from "./host-stage";
import { SCOREBOARD_HOLD_MS } from "./scoreboard";

const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

/** `correct` is what the server sends: null until the results. */
function capitals(correct: (boolean | null)[]): HostQuestionData {
	return {
		type: "quiz",
		selection: "single",
		slider: null,
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
		scoreboard: null,
		scoreboardLeavers: null,
		autoAdvance: null,
		typedAnswers: null,
		reviewOpen: false,
		sliderResults: null,
		puzzleResults: null,
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
	options: {
		showQuestionsOnDevices: false,
		randomizeQuestions: false,
		randomizeAnswers: false,
		autoplay: false,
		gameCharacters: true,
	},
	players: [
		{ id: "p1", nickname: "Ana", avatar: null },
		{ id: "p2", nickname: "Bia", avatar: null },
	],
	questionCount: 10,
	autoStart: null,
	stage: null,
	final: null,
};

function renderStage(
	stage: HostStageData,
	options: {
		advance?: HostStageActions["advance"];
		receivedAt?: number;
		review?: HostStageActions["review"];
	} = {},
) {
	const actions: HostStageActions = {
		advance: options.advance ?? vi.fn(async () => {}),
		setLocked: vi.fn(),
		setOptions: vi.fn(),
		end: vi.fn(),
		review: options.review,
	};
	const user = userEvent.setup(
		vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : undefined,
	);
	const receivedAt = options.receivedAt ?? Date.now();
	const screenAt = (shown: HostStageData) => (
		<HostStage
			game={{ ...game, stage: shown }}
			stage={shown}
			origin="https://quizio.app"
			receivedAt={receivedAt}
			actions={actions}
		/>
	);
	const view = render(screenAt(stage));
	return {
		actions,
		user,
		/** The same screen told another view of the game. */
		rerender: (next: HostStageData) => view.rerender(screenAt(next)),
	};
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const choices = () =>
	within(screen.getByRole("list", { name: "Respostas" })).getAllByRole(
		"listitem",
	);

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
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

	describe("the question's intro, in two steps", () => {
		const intro = stageAt({
			questionIndex: 1,
			phase: "questionIntro",
			remainingMs: QUESTION_INTRO_MS,
			durationMs: QUESTION_INTRO_MS,
		});
		const position = () =>
			document.querySelector('[data-slot="question-position"]');
		const statement = () =>
			screen.queryByRole("heading", { name: "Qual é a capital do Brasil?" });

		it("opens with the type of the question and its position", () => {
			vi.useFakeTimers();
			renderStage(intro);

			// It comes in animated: the test only asks that it is there.
			expect(screen.getByRole("heading", { name: "Quiz" })).toBeInTheDocument();
			expect(
				document.querySelector('[data-slot="question-type-icon"]'),
			).not.toBeNull();
			expect(position()).toHaveTextContent("2/10");
			// The question waits for its turn, and so does the reading time.
			expect(statement()).toBeNull();
			expect(screen.queryByRole("progressbar")).toBeNull();
		});

		it("then shows the question, its position and the reading time, without the answers", async () => {
			vi.useFakeTimers();
			renderStage(intro);

			await tick(QUESTION_TYPE_REVEAL_MS + 200);

			expect(statement()).toBeVisible();
			expect(screen.queryByRole("heading", { name: "Quiz" })).toBeNull();
			// The type stays, small, for who reads the screen.
			expect(screen.getByText("Quiz")).toBeInTheDocument();
			expect(position()).toHaveTextContent("2/10");
			expect(
				screen.getByRole("progressbar", { name: "Tempo de leitura" }),
			).toBeVisible();
			expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
			expect(screen.queryByText("Brasília")).toBeNull();
		});

		it("the reading bar fills over the time the question is on the screen", async () => {
			vi.useFakeTimers();
			renderStage(intro);
			const bar = () =>
				Number(
					screen
						.getByRole("progressbar", { name: "Tempo de leitura" })
						.getAttribute("aria-valuenow"),
				);

			await tick(QUESTION_TYPE_REVEAL_MS + 200);
			expect(bar()).toBeLessThan(15);

			await tick(QUESTION_INTRO_MS - QUESTION_TYPE_REVEAL_MS - 400);
			expect(bar()).toBeGreaterThan(85);
		});

		it("a reload in the middle of the intro goes straight to the question", () => {
			vi.useFakeTimers();
			renderStage({ ...intro, remainingMs: 4_000 });

			expect(statement()).toBeVisible();
			expect(screen.queryByRole("heading", { name: "Quiz" })).toBeNull();
		});

		it("with reduced motion the question shows at once", () => {
			stubReducedMotion(true);
			renderStage(intro);

			expect(statement()).toBeVisible();
			expect(position()).toHaveTextContent("2/10");
		});

		it("names the type of a true/false question", () => {
			vi.useFakeTimers();
			renderStage({
				...intro,
				question: { ...capitals(hidden), type: "trueFalse" },
			});

			expect(
				screen.getByRole("heading", { name: "Verdadeiro ou falso" }),
			).toBeInTheDocument();
		});
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

	it("sizes the cards by how many rows there are", () => {
		const rowsOf = (count: number) => {
			const question = {
				...capitals(hidden),
				choices: capitals(hidden).choices.slice(0, count),
			};
			const view = render(
				<HostStage
					game={{ ...game, stage: stageAt({ question }) }}
					stage={stageAt({ question })}
					origin="https://quizio.app"
					receivedAt={Date.now()}
					actions={{
						advance: vi.fn(async () => {}),
						setLocked: vi.fn(),
						setOptions: vi.fn(),
						end: vi.fn(),
					}}
				/>,
			);
			const list = screen.getByRole("list", { name: "Respostas" });
			const result = {
				rows: list.dataset.rows,
				card: choices()[0]?.className ?? "",
			};
			view.unmount();
			return result;
		};

		const two = rowsOf(2);
		const four = rowsOf(4);

		expect(two.rows).toBe("1");
		expect(four.rows).toBe("2");
		// One row of two answers is taller than each row of four.
		expect(two.card).toMatch(/19svh/);
		expect(four.card).toMatch(/12svh/);
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

	describe("asked again about the same stage (spec 012)", () => {
		const actions = (): HostStageActions => ({
			advance: vi.fn(async () => {}),
			setLocked: vi.fn(),
			setOptions: vi.fn(),
			end: vi.fn(),
		});
		const at = (stage: HostStageData, on: HostStageActions) => (
			<HostStage
				game={{ ...game, stage }}
				stage={stage}
				origin="https://quizio.app"
				receivedAt={Date.now()}
				actions={on}
			/>
		);
		const timeLeft = () =>
			screen.getByRole("timer", { name: "Tempo restante" });

		it("the countdown does not go back with a late answer", async () => {
			vi.useFakeTimers();
			const on = actions();
			const view = render(at(stageAt({ remainingMs: 20_000 }), on));
			await tick(5_000);
			expect(timeLeft()).toHaveTextContent("15");

			// The screen asks again; the answer took a while and says there are
			// 15.8 s left from now, more than the screen is showing.
			view.rerender(at(stageAt({ remainingMs: 15_800 }), on));
			await tick(200);

			expect(timeLeft()).toHaveTextContent("15");

			// And the results are still asked for at the time first told.
			await tick(14_800);
			expect(on.advance).toHaveBeenCalledExactlyOnceWith(
				{ questionIndex: 0, phase: "answering" },
				false,
			);
		});

		it("takes a reading that ends sooner", async () => {
			vi.useFakeTimers();
			const on = actions();
			const view = render(at(stageAt({ remainingMs: 20_000 }), on));
			await tick(5_000);

			view.rerender(at(stageAt({ remainingMs: 12_000 }), on));
			await tick(200);

			expect(timeLeft()).toHaveTextContent("12");
		});

		it("a new stage starts its own countdown", async () => {
			vi.useFakeTimers();
			const on = actions();
			const view = render(
				at(stageAt({ phase: "questionIntro", remainingMs: 1_000 }), on),
			);
			await tick(500);

			view.rerender(at(stageAt({ remainingMs: 20_000 }), on));
			await tick(200);

			expect(timeLeft()).toHaveTextContent("20");
		});
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
				slider: null,
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

describe("HostStage: scoreboard (spec 010)", () => {
	const board = stageAt({
		questionIndex: 1,
		phase: "scoreboard",
		remainingMs: null,
		durationMs: null,
		question: null,
		scoreboard: [
			{
				playerId: "p2",
				nickname: "John",
				avatar: null,
				total: 701,
				rank: 1,
				climbed: true,
				previous: { rank: 2, total: 0 },
			},
			{
				playerId: "p1",
				nickname: "Claude",
				avatar: null,
				total: 639,
				rank: 2,
				climbed: false,
				previous: { rank: 1, total: 639 },
			},
			{
				playerId: "p3",
				nickname: "Bia",
				avatar: null,
				total: 0,
				rank: 3,
				climbed: false,
				previous: { rank: 3, total: 0 },
			},
		],
		scoreboardLeavers: [],
	});
	/** The scoreboard's whole animation (spec 011): hold, count, rows settling. */
	const SEQUENCE_MS = SCOREBOARD_HOLD_MS + GAME_MOTION.countMs + 1_000;
	const entries = () =>
		within(screen.getByRole("list", { name: "Placar" })).getAllByRole(
			"listitem",
		);

	it("shows the scoreboard with the leader first and who climbed", async () => {
		vi.useFakeTimers();
		renderStage(board);

		// It opens as it was before the question (spec 011, RN-28).
		expect(entries().map((entry) => entry.textContent)).toEqual([
			"Claude639",
			"John0",
			"Bia0",
		]);
		await tick(SEQUENCE_MS);

		expect(entries().map((entry) => entry.textContent)).toEqual([
			"John701subiu de posição",
			"Claude639",
			"Bia0",
		]);
		expect(entries().map((entry) => entry.dataset.leader)).toEqual([
			"true",
			"false",
			"false",
		]);
		expect(
			document.querySelectorAll('[data-slot="scoreboard-climbed"]'),
		).toHaveLength(1);
		// The scoreboard shows no question and no answers.
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
		expect(screen.queryByText("Capitais")).toBeNull();
	});

	it("the scoreboard waits for the host, who advances", async () => {
		vi.useFakeTimers();
		const { actions } = renderStage(board);

		await tick(120_000);
		expect(actions.advance).not.toHaveBeenCalled();

		vi.useRealTimers();
		await userEvent.click(screen.getByRole("button", { name: "Avançar" }));

		expect(actions.advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 1, phase: "scoreboard" },
			false,
		);
	});

	it("shows an empty list rather than breaking when the scoreboard is missing", () => {
		renderStage({ ...board, scoreboard: null });

		expect(screen.getByRole("button", { name: "Avançar" })).toBeVisible();
		expect(screen.queryAllByRole("listitem")).toHaveLength(0);
	});
});

describe("HostStage: animations hold nothing (spec 011, RN-25)", () => {
	it("a new phase shows at once, in the middle of the scoreboard's animation", () => {
		const scoreboard = stageAt({
			phase: "scoreboard",
			remainingMs: null,
			durationMs: null,
			question: null,
			scoreboard: [
				{
					playerId: "p1",
					nickname: "Ana",
					avatar: null,
					total: 875,
					rank: 1,
					climbed: false,
					previous: null,
				},
			],
			scoreboardLeavers: [],
		});
		const actions: HostStageActions = {
			advance: vi.fn(),
			setLocked: vi.fn(),
			setOptions: vi.fn(),
			end: vi.fn(),
		};
		const ui = (stage: HostStageData) => (
			<HostStage
				game={{ ...game, stage }}
				stage={stage}
				origin="https://quizio.app"
				receivedAt={Date.now()}
				actions={actions}
			/>
		);
		const view = render(ui(scoreboard));
		expect(screen.getByRole("list", { name: "Placar" }).dataset.step).toBe(
			"before",
		);

		view.rerender(
			ui(
				stageAt({
					questionIndex: 1,
					phase: "questionIntro",
					remainingMs: 5_000,
					durationMs: 5_000,
				}),
			),
		);

		expect(screen.queryByRole("list", { name: "Placar" })).toBeNull();
		// The next question opens with its type (spec 012).
		expect(screen.getByRole("heading", { name: "Quiz" })).toBeInTheDocument();
	});
});

describe("HostStage: settings and late joining (spec 012)", () => {
	const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
		await user.click(screen.getByRole("button", { name: "Configurações" }));
		return screen.getByRole("dialog", { name: "Configurações" });
	};

	it("shows how to get in, in the header", () => {
		renderStage(stageAt({}));

		const join = within(screen.getByRole("banner")).getByRole("region", {
			name: "Como entrar",
		});
		expect(join).toHaveTextContent("Entre em quizio.app/join");
		expect(within(join).getByText("265 914")).toBeInTheDocument();
	});

	it("opens the settings during the answers", async () => {
		const { actions, user } = renderStage(stageAt({}));

		const panel = await openSettings(user);

		expect(within(panel).getAllByRole("switch")).toHaveLength(6);
		expect(
			within(panel).getAllByText("Só antes de iniciar a partida."),
		).toHaveLength(2);

		await user.click(
			within(panel).getByRole("switch", {
				name: "Mostrar perguntas nos dispositivos",
			}),
		);
		await user.click(
			within(panel).getByRole("switch", { name: "Bloquear jogo" }),
		);

		expect(actions.setOptions).toHaveBeenCalledExactlyOnceWith({
			showQuestionsOnDevices: true,
		});
		expect(actions.setLocked).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("the results show behind the open panel", async () => {
		const actions: HostStageActions = {
			advance: vi.fn(async () => {}),
			setLocked: vi.fn(),
			setOptions: vi.fn(),
			end: vi.fn(),
		};
		const user = userEvent.setup();
		const at = (stage: HostStageData) => (
			<HostStage
				game={{ ...game, stage }}
				stage={stage}
				origin="https://quizio.app"
				receivedAt={Date.now()}
				actions={actions}
			/>
		);
		const view = render(at(stageAt({})));
		await openSettings(user);

		// The answers close while the panel is open: the game does not wait for it.
		view.rerender(
			at(
				stageAt({
					phase: "results",
					remainingMs: null,
					durationMs: null,
					question: capitals(revealed),
					answerCount: 2,
					distribution: [
						{ choiceId: "choice-1", count: 0 },
						{ choiceId: "choice-2", count: 0 },
						{ choiceId: "choice-3", count: 2 },
						{ choiceId: "choice-4", count: 0 },
					],
				}),
			),
		);

		expect(screen.getByRole("dialog", { name: "Configurações" })).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Avançar", hidden: true }),
		).toBeInTheDocument();
	});

	it("a locked game shows the padlock in place of the PIN", () => {
		const stage = stageAt({});
		render(
			<HostStage
				game={{ ...game, locked: true, stage }}
				stage={stage}
				origin="https://quizio.app"
				receivedAt={Date.now()}
				actions={{
					advance: vi.fn(async () => {}),
					setLocked: vi.fn(),
					setOptions: vi.fn(),
					end: vi.fn(),
				}}
			/>,
		);

		const join = within(screen.getByRole("banner")).getByRole("region", {
			name: "Como entrar",
		});
		expect(join).toHaveTextContent("Jogo bloqueado");
		expect(screen.queryByText("265 914")).toBeNull();
	});
});

describe("HostStage: Encerrar agora (spec 013)", () => {
	const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
		await user.click(screen.getByRole("button", { name: "Configurações" }));
		return screen.getByRole("dialog", { name: "Configurações" });
	};

	it("Encerrar agora asks and ends the game", async () => {
		const { actions, user } = renderStage(stageAt({ remainingMs: 20_000 }));
		const panel = await openSettings(user);

		await user.click(
			within(panel).getByRole("button", { name: "Encerrar agora" }),
		);
		expect(actions.end).not.toHaveBeenCalled();
		await user.click(
			within(
				screen.getByRole("alertdialog", { name: "Encerrar o jogo?" }),
			).getByRole("button", { name: "Encerrar" }),
		);

		expect(actions.end).toHaveBeenCalledTimes(1);
	});

	it("cancelling keeps the game and the panel", async () => {
		const { actions, user } = renderStage(stageAt({ remainingMs: 20_000 }));
		const panel = await openSettings(user);

		await user.click(
			within(panel).getByRole("button", { name: "Encerrar agora" }),
		);
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(actions.end).not.toHaveBeenCalled();
		expect(
			screen.getByRole("dialog", { name: "Configurações" }),
		).toBeInTheDocument();
	});
});

describe("HostStage: a lost connection (spec 013)", () => {
	const actions = (advance: HostStageActions["advance"]): HostStageActions => ({
		advance,
		setLocked: vi.fn(),
		setOptions: vi.fn(),
		end: vi.fn(),
	});
	const at = (
		stage: HostStageData,
		on: HostStageActions,
		connected: boolean,
		receivedAt: number,
	) => (
		<HostStage
			game={{ ...game, stage }}
			stage={stage}
			origin="https://quizio.app"
			receivedAt={receivedAt}
			connected={connected}
			actions={on}
		/>
	);
	const timeLeft = () => screen.getByRole("timer", { name: "Tempo restante" });

	it("does not ask for the next stage while disconnected", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		render(
			at(stageAt({ remainingMs: 1_000 }), actions(advance), false, Date.now()),
		);

		await tick(3_000);

		expect(advance).not.toHaveBeenCalled();
	});

	it("asks again when the connection returns and the time is up", async () => {
		vi.useFakeTimers();
		// The request made when the time ran out got no answer.
		const advance = vi
			.fn<HostStageActions["advance"]>()
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValue(undefined);
		const on = actions(advance);
		const stage = stageAt({ remainingMs: 1_000 });
		const receivedAt = Date.now();
		const view = render(at(stage, on, true, receivedAt));
		await tick(1_200);
		expect(advance).toHaveBeenCalledTimes(1);

		view.rerender(at(stage, on, false, receivedAt));
		await tick(8_000);
		expect(advance).toHaveBeenCalledTimes(1);

		view.rerender(at(stage, on, true, receivedAt));
		await tick(50);

		expect(advance).toHaveBeenCalledTimes(2);
		expect(advance).toHaveBeenLastCalledWith(
			{ questionIndex: 0, phase: "answering" },
			false,
		);
	});

	it("keeps the countdown across a reconnection", async () => {
		vi.useFakeTimers();
		const on = actions(vi.fn(async () => {}));
		const receivedAt = Date.now();
		const view = render(
			at(stageAt({ remainingMs: 20_000 }), on, true, receivedAt),
		);
		await tick(5_000);

		view.rerender(at(stageAt({ remainingMs: 20_000 }), on, false, receivedAt));
		await tick(3_000);
		expect(timeLeft()).toHaveTextContent("12");

		// Back, the server tells the time left again, a little late.
		view.rerender(at(stageAt({ remainingMs: 12_600 }), on, true, Date.now()));
		await tick(200);

		expect(timeLeft()).toHaveTextContent("12");
	});
});

describe("HostStage: autoplay (spec 014)", () => {
	const actions = (advance: HostStageActions["advance"]): HostStageActions => ({
		advance,
		setLocked: vi.fn(),
		setOptions: vi.fn(),
		end: vi.fn(),
	});
	const resultsWith = (
		autoAdvance: HostStageData["autoAdvance"],
	): HostStageData =>
		stageAt({
			phase: "results",
			remainingMs: null,
			durationMs: null,
			question: capitals(revealed),
			autoAdvance,
		});
	const at = (
		stage: HostStageData,
		on: HostStageActions,
		options: { connected?: boolean; receivedAt?: number } = {},
	) => (
		<HostStage
			game={{ ...game, stage }}
			stage={stage}
			origin="https://quizio.app"
			receivedAt={options.receivedAt ?? Date.now()}
			connected={options.connected ?? true}
			actions={on}
		/>
	);
	const countdown = () => screen.queryByRole("timer", { name: "Avança em" });
	const advanceButton = () => screen.queryByRole("button", { name: "Avançar" });

	it("shows the countdown in place of Avançar in the results and asks at zero", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		render(
			at(resultsWith({ remainingMs: 5_000, token: "a" }), actions(advance)),
		);

		expect(countdown()).toHaveTextContent("5");
		expect(advanceButton()).toBeNull();

		await tick(4_800);
		expect(advance).not.toHaveBeenCalled();
		await tick(300);

		expect(advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "results" },
			false,
		);
	});

	it("shows the countdown in the scoreboard and asks at zero", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		render(
			at(
				stageAt({
					phase: "scoreboard",
					remainingMs: null,
					durationMs: null,
					question: null,
					scoreboard: [],
					scoreboardLeavers: [],
					autoAdvance: { remainingMs: 5_000, token: "s" },
				}),
				actions(advance),
			),
		);

		expect(countdown()).toHaveTextContent("5");
		expect(advanceButton()).toBeNull();
		await tick(5_100);

		expect(advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "scoreboard" },
			false,
		);
	});

	it("without a countdown the results wait for Avançar", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		render(at(resultsWith(null), actions(advance)));

		await tick(30_000);

		expect(countdown()).toBeNull();
		expect(advanceButton()).not.toBeNull();
		expect(advance).not.toHaveBeenCalled();
	});

	it("Avançar is back when the countdown goes", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		const on = actions(advance);
		const view = render(
			at(resultsWith({ remainingMs: 3_000, token: "a" }), on),
		);
		await tick(1_000);

		// The switch was turned off.
		view.rerender(at(resultsWith(null), on));
		await tick(10_000);

		expect(countdown()).toBeNull();
		expect(advanceButton()).not.toBeNull();
		expect(advance).not.toHaveBeenCalled();
	});

	it("a countdown turned on again starts over", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		const on = actions(advance);
		const view = render(
			at(resultsWith({ remainingMs: 2_000, token: "a" }), on),
		);
		await tick(1_000);

		// Off and on again: 5 s from then, which ends later than the first one.
		view.rerender(at(resultsWith({ remainingMs: 5_000, token: "b" }), on));
		await tick(1_500);

		expect(advance).not.toHaveBeenCalled();
		expect(countdown()).toHaveTextContent("4");
	});

	it("asks for the next stage when the connection returns", async () => {
		vi.useFakeTimers();
		const advance = vi.fn(async () => {});
		const on = actions(advance);
		const stage = resultsWith({ remainingMs: 5_000, token: "a" });
		const receivedAt = Date.now();
		const view = render(at(stage, on, { connected: false, receivedAt }));

		await tick(20_000);
		expect(advance).not.toHaveBeenCalled();

		view.rerender(at(stage, on, { connected: true, receivedAt }));
		await tick(50);

		expect(advance).toHaveBeenCalledExactlyOnceWith(
			{ questionIndex: 0, phase: "results" },
			false,
		);
	});
});

describe("HostStage: type answer (spec 031)", () => {
	const typed: HostQuestionData = {
		type: "typeAnswer",
		selection: "single",
		slider: null,
		text: "Quem andou sobre as águas?",
		choices: [],
		image: null,
	};
	const results = (overrides: Partial<HostStageData> = {}) =>
		stageAt({
			phase: "results",
			remainingMs: null,
			durationMs: null,
			question: typed,
			answerCount: 2,
			typedAnswers: {
				tags: [
					{ text: "Pedro", count: 1, correct: true },
					{ text: "Pedra", count: 1, correct: false },
				],
			},
			...overrides,
		});
	const reviewActions = () => ({
		open: vi.fn(async () => {}),
		close: vi.fn(async () => {}),
		answers: vi.fn(async () => [
			{
				key: "pedro",
				text: "Pedro",
				count: 1,
				correct: true,
				accepted: true,
				similar: false,
			},
			{
				key: "pedra",
				text: "Pedra",
				count: 1,
				correct: false,
				accepted: false,
				similar: true,
			},
		]),
		submit: vi.fn(async () => {}),
	});

	it("a review the server has open shows again after a reload (spec 031, RN-32)", async () => {
		const review = reviewActions();
		renderStage(results({ reviewOpen: true }), { review });

		expect(
			await screen.findByRole("region", { name: "Revisar respostas" }),
		).toBeInTheDocument();
		expect(review.answers).toHaveBeenCalledOnce();
		expect(review.open).not.toHaveBeenCalled();
	});

	it("a review this screen cancelled is not reopened by a late view", async () => {
		const user = userEvent.setup();
		const review = reviewActions();
		const view = renderStage(results({ reviewOpen: true }), { review });
		await screen.findByRole("region", { name: "Revisar respostas" });

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		view.rerender(results({ reviewOpen: true }));

		expect(
			screen.queryByRole("region", { name: "Revisar respostas" }),
		).toBeNull();
		expect(review.close).toHaveBeenCalledOnce();
	});

	it("a type answer shows Jogadores, digitem a resposta! instead of choices", () => {
		renderStage(stageAt({ question: typed }));

		expect(
			screen.getByText("Jogadores, digitem a resposta!"),
		).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
	});

	it("the results opened at once show the correct answers", () => {
		renderStage(results());

		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
	});

	it("opens the review, which sends the marks", async () => {
		const review = reviewActions();
		const { user } = renderStage(results(), { review });

		await user.click(screen.getByRole("button", { name: "Revisar respostas" }));
		await user.click(await screen.findByRole("button", { name: /Pedra/ }));
		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(review.open).toHaveBeenCalledWith({
			questionIndex: 0,
			phase: "results",
		});
		expect(review.submit).toHaveBeenCalledWith(
			{ questionIndex: 0, phase: "results" },
			[{ key: "pedra", correct: true }],
		);
	});

	it("no countdown while the review is open", async () => {
		vi.useFakeTimers();
		const review = reviewActions();
		const advance = vi.fn(async () => {});
		renderStage(results({ autoAdvance: { remainingMs: 5_000, token: "a" } }), {
			advance,
			review,
		});

		fireEvent.click(screen.getByRole("button", { name: "Revisar respostas" }));
		await tick(10_000);

		expect(advance).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(review.close).toHaveBeenCalledOnce();
	});
});

describe("HostStage: slider (spec 032)", () => {
	const scale = {
		min: 100,
		max: 900,
		first: 104,
		last: 896,
		step: 8,
		start: 496,
		unit: "anos",
	};
	const slider: HostQuestionData = {
		type: "slider",
		selection: "single",
		slider: scale,
		text: "Quantos anos tinha Noé?",
		choices: [],
		image: null,
	};
	const results = (overrides: Partial<HostStageData> = {}) =>
		stageAt({
			phase: "results",
			remainingMs: null,
			durationMs: null,
			question: slider,
			answerCount: 3,
			sliderResults: {
				answer: 600,
				low: 520,
				high: 680,
				unit: "anos",
				counts: [
					{ value: 104, count: 1 },
					{ value: 600, count: 2 },
				],
			},
			...overrides,
		});
	const tag = () => document.querySelector("[data-slot=slider-tag]");

	it("the host sees the small scale with its ends while players answer", () => {
		renderStage(stageAt({ question: slider }));

		const answering = document.querySelector("[data-slot=slider-answering]");
		expect(answering).toHaveTextContent("104");
		expect(answering).toHaveTextContent("896");
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
	});

	it("opens on the answer with its green tag and count", () => {
		renderStage(results());

		expect(tag()).toHaveAttribute("data-kind", "answer");
		expect(tag()).toHaveTextContent("600anos2");
		expect(
			screen.getByRole("button", { name: "600 anos: 2 respostas" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(document.querySelectorAll("[data-slot=slider-bar]").length).toBe(2);
	});

	it("choosing a column outside the margin shows a red tag", async () => {
		const user = userEvent.setup();
		renderStage(results());

		await user.click(
			screen.getByRole("button", { name: "104 anos: 1 resposta" }),
		);

		expect(tag()).toHaveAttribute("data-kind", "outside");
		expect(tag()).toHaveTextContent("104anos1");
		// Its bar turns red under the tag, as in Kahoot.
		expect(
			screen
				.getByRole("button", { name: "104 anos: 1 resposta" })
				.querySelector("[data-slot=slider-bar]"),
		).toHaveClass("bg-destructive");
	});

	it("an empty column outside the margin turns red under the tag", async () => {
		const user = userEvent.setup();
		renderStage(results());
		const column = screen.getByRole("button", {
			name: "112 anos: 0 respostas",
		});

		await user.click(column);

		expect(column.querySelector("[data-slot=slider-dot]")).toHaveClass(
			"bg-destructive",
		);
	});

	it("shows a number under every tenth position, unclipped at the sides", () => {
		renderStage(results());

		const marks = [...document.querySelectorAll("[data-slot=slider-mark]")].map(
			(mark) => mark.textContent,
		);
		expect(marks).toContain("520");
		expect(marks).toContain("680");
		expect(marks).not.toContain("104");
		expect(
			document.querySelector("[data-slot=slider-results-view]"),
		).not.toHaveClass("overflow-x-clip");
	});

	it("dragging moves the tag to the column in the middle; letting go is not a click", () => {
		renderStage(results());
		const view = document.querySelector(
			"[data-slot=slider-results-view]",
		) as HTMLElement;

		fireEvent.pointerDown(view, { clientX: 300, pointerId: 1 });
		fireEvent.pointerMove(view, { clientX: 300 - 36 * 3, pointerId: 1 });
		fireEvent.pointerUp(view, { pointerId: 1 });
		fireEvent.click(
			screen.getByRole("button", { name: "104 anos: 1 resposta" }),
		);

		expect(document.querySelector("[data-slot=slider-tag]")).toHaveAttribute(
			"data-kind",
			"margin",
		);
		expect(document.querySelector("[data-slot=slider-tag]")).toHaveTextContent(
			"624anos0",
		);
	});

	it("the answer's check floats right over its bar", () => {
		renderStage(results());

		const check = document.querySelector(
			"[data-slot=slider-answer-check]",
		) as HTMLElement;
		// 48 px of foot, the tallest bar's 128 px and 4 px of room.
		expect(check.style.bottom).toBe("180px");
	});

	it("Mostrar mídia swaps the chart for the image", async () => {
		const user = userEvent.setup();
		renderStage(
			results({
				question: {
					...slider,
					image: {
						url: "https://media.test/noe.png",
						placement: "media",
						crop: null,
						altText: "A arca",
					},
				},
			}),
		);

		await user.click(screen.getByRole("button", { name: "Mostrar mídia" }));

		expect(screen.getByRole("img", { name: "A arca" })).toBeInTheDocument();
		expect(
			screen.queryByRole("region", {
				name: "Respostas no controle deslizante",
			}),
		).toBeNull();
	});
});

describe("HostStage: slider results, pointing (spec 032, RN-31)", () => {
	it("pointing at a column shows its number small and keeps the answer's tag", async () => {
		const user = userEvent.setup();
		renderStage(
			stageAt({
				phase: "results",
				remainingMs: null,
				durationMs: null,
				question: {
					type: "slider",
					selection: "single",
					slider: {
						min: 100,
						max: 900,
						first: 104,
						last: 896,
						step: 8,
						start: 496,
						unit: "anos",
					},
					text: "Quantos anos?",
					choices: [],
					image: null,
				},
				sliderResults: {
					answer: 600,
					low: 520,
					high: 680,
					unit: "anos",
					counts: [{ value: 640, count: 1 }],
				},
			}),
		);

		await user.hover(
			screen.getByRole("button", { name: "640 anos: 1 resposta" }),
		);

		expect(
			document.querySelector("[data-slot=slider-pointed]"),
		).toHaveTextContent("640");
		expect(document.querySelector("[data-slot=slider-tag]")).toHaveAttribute(
			"data-kind",
			"answer",
		);
	});
});
