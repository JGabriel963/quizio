import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	PlayerOutcomeData,
	PlayerQuestionData,
	PlayerStageData,
} from "@/lib/api-types";

import { PlayerStage } from "./player-stage";

function quiz(
	count = 4,
	selection: PlayerQuestionData["selection"] = "single",
): PlayerQuestionData {
	return {
		type: "quiz",
		selection,
		text: null,
		image: null,
		choices: Array.from({ length: count }, (_, index) => ({
			id: `choice-${index + 1}`,
			shapeIndex: index,
			label: null,
			text: null,
		})),
	};
}

const trueFalse: PlayerQuestionData = {
	type: "trueFalse",
	selection: "single",
	text: null,
	image: null,
	choices: [
		{ id: "true", shapeIndex: 1, label: "Verdadeiro", text: null },
		{ id: "false", shapeIndex: 0, label: "Falso", text: null },
	],
};

const STATEMENT = "Qual é a capital do Brasil?";
const TEXTS = ["Brasília", "Rio de Janeiro", "Salvador", "Recife"];

/** The same question with "Mostrar perguntas nos dispositivos" on (spec 012). */
function onDevice(
	overrides: Partial<PlayerQuestionData> = {},
	texts: readonly string[] = TEXTS,
): PlayerQuestionData {
	return {
		type: "quiz",
		selection: "single",
		text: STATEMENT,
		image: null,
		choices: texts.map((text, index) => ({
			id: `choice-${index + 1}`,
			shapeIndex: index,
			label: null,
			text,
		})),
		...overrides,
	};
}

function stageAt(overrides: Partial<PlayerStageData> = {}): PlayerStageData {
	return {
		questionIndex: 1,
		questionCount: 10,
		phase: "answering",
		durationMs: 20_000,
		remainingMs: 20_000,
		question: quiz(),
		sittingOut: false,
		answered: false,
		total: 0,
		outcome: null,
		...overrides,
	};
}

function renderStage(
	stage: PlayerStageData | null,
	props: Partial<Parameters<typeof PlayerStage>[0]> = {},
) {
	const onAnswer = vi.fn();
	const user = userEvent.setup();
	render(
		<PlayerStage
			nickname="ACT"
			finished={false}
			final={null}
			stage={stage}
			receivedAt={Date.now()}
			late={false}
			notice={null}
			onAnswer={onAnswer}
			onLeave={vi.fn()}
			{...props}
		/>,
	);
	return { onAnswer, user };
}

const buttons = () =>
	[
		...document.querySelectorAll('[data-slot="answer-button"]'),
	] as HTMLElement[];

afterEach(() => {
	vi.useRealTimers();
});

describe("PlayerStage: before the answers (spec 009)", () => {
	it("gets ready during the game intro", () => {
		renderStage(stageAt({ phase: "gameIntro", question: null }));

		expect(screen.getByRole("heading", { name: "Prepare-se!" })).toBeVisible();
		expect(screen.getByRole("status")).toHaveTextContent("Carregando…");
		expect(buttons()).toHaveLength(0);
		expect(
			document.querySelector('[data-slot="player-nickname"]'),
		).toHaveTextContent("ACT");
	});

	it("counts the question intro down, without answer buttons", async () => {
		vi.useFakeTimers();
		renderStage(
			stageAt({
				phase: "questionIntro",
				durationMs: 5_000,
				remainingMs: 5_000,
			}),
		);

		expect(screen.getByRole("heading", { name: "Pergunta 2" })).toBeVisible();
		expect(screen.getByText("Preparar…")).toBeVisible();
		expect(screen.getByText("Quiz")).toBeVisible();
		expect(buttons()).toHaveLength(0);
		const timer = screen.getByRole("timer", { name: "Tempo de leitura" });
		expect(timer).toHaveTextContent("5");

		await act(() => vi.advanceTimersByTimeAsync(2_000));
		expect(timer).toHaveTextContent("3");
	});
});

describe("PlayerStage: answering (spec 009)", () => {
	it("shows a button per answer, named by shape and color, with no text", () => {
		renderStage(stageAt());

		expect(
			buttons().map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"Triângulo vermelho",
			"Losango azul",
			"Círculo amarelo",
			"Quadrado verde",
		]);
		expect(buttons().every((button) => button.textContent === "")).toBe(true);
		expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
	});

	it("a tap sends the answer in single selection", async () => {
		const { onAnswer, user } = renderStage(stageAt());

		await user.click(
			screen.getByRole("button", { name: "Triângulo vermelho" }),
		);

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-1"]);
	});

	it("shows only the answers the question has", () => {
		const question = quiz();
		renderStage(
			stageAt({
				question: {
					...question,
					choices: question.choices.filter((choice) => choice.shapeIndex !== 2),
				},
			}),
		);

		expect(buttons().map((button) => button.dataset.shape)).toEqual([
			"triangle",
			"diamond",
			"square",
		]);
	});

	it("shows six answers in two columns", () => {
		renderStage(stageAt({ question: quiz(6) }));

		expect(buttons()).toHaveLength(6);
		expect(screen.getByRole("group", { name: "Respostas" })).toHaveClass(
			"grid-cols-2",
		);
	});

	it("names the true/false buttons for screen readers, blue diamond then red triangle", async () => {
		const { onAnswer, user } = renderStage(stageAt({ question: trueFalse }));

		expect(buttons().map((button) => button.dataset.shape)).toEqual([
			"diamond",
			"triangle",
		]);
		expect(screen.getByText("Verdadeiro ou falso")).toBeVisible();
		// As in Kahoot, the buttons show only the shape.
		expect(buttons().every((button) => button.textContent === "")).toBe(true);

		await user.click(screen.getByRole("button", { name: "Falso" }));

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["false"]);
	});

	it("marks and sends in multiple selection (spec 012)", async () => {
		const { onAnswer, user } = renderStage(
			stageAt({ question: quiz(4, "multiple") }),
		);

		expect(screen.getByText("Selecione uma ou mais respostas!")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Losango azul" }));
		await user.click(screen.getByRole("button", { name: "Quadrado verde" }));
		expect(onAnswer).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-2", "choice-4"]);
	});

	it("waits after answering, without saying how it went", () => {
		renderStage(stageAt({ answered: true }));

		expect(screen.getByRole("status")).toHaveTextContent("Será que acertou?");
		expect(buttons()).toHaveLength(0);
		expect(document.querySelector('[data-slot="result-mark"]')).toBeNull();
	});

	it("says the time is up when the answer arrived late", () => {
		renderStage(stageAt(), { late: true });

		expect(
			screen.getByRole("heading", { name: "Tempo esgotado" }),
		).toBeVisible();
		expect(buttons()).toHaveLength(0);
	});

	it("shows a failure to send, keeping the buttons to try again", () => {
		renderStage(stageAt(), {
			notice: "Não foi possível concluir. Tente novamente.",
		});

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível concluir. Tente novamente.",
		);
		expect(buttons()).toHaveLength(4);
	});
});

describe("PlayerStage: results and end (spec 009)", () => {
	const outcomeOf = (
		result: PlayerOutcomeData["result"],
		overrides: Partial<PlayerOutcomeData> = {},
	): PlayerOutcomeData => ({
		result,
		points: result === "correct" ? 639 : 0,
		streak: result === "correct" ? 2 : 0,
		rank: 2,
		behind: { nickname: "Bia", points: 62 },
		...overrides,
	});
	const results = (
		result: PlayerOutcomeData["result"] | null,
		overrides: Partial<PlayerOutcomeData> = {},
		stage: Partial<PlayerStageData> = {},
	) =>
		stageAt({
			phase: "results",
			durationMs: null,
			remainingMs: null,
			total: 1340,
			outcome: result && outcomeOf(result, overrides),
			...stage,
		});
	const slot = (name: string) =>
		document.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;
	const mark = () =>
		(document.querySelector('[data-slot="result-mark"]') as HTMLElement | null)
			?.dataset.result;

	it.each([
		["correct", "Correto"],
		["partiallyCorrect", "Parcialmente correto"],
		["wrong", "Incorreto"],
	] as const)("tells a %s answer", (result, title) => {
		renderStage(results(result));

		expect(screen.getByRole("heading", { name: title })).toBeVisible();
		expect(mark()).toBe(result);
		expect(screen.queryByText("Ainda não acabou!")).toBeNull();
		expect(buttons()).toHaveLength(0);
	});

	it("cheers up who got it wrong", () => {
		renderStage(results("wrong"));

		expect(screen.getByText("Boa tentativa!")).toBeVisible();
	});

	it("tells who did not answer that the time is up, and that it is not over", () => {
		renderStage(results("timeout"));

		expect(
			screen.getByRole("heading", { name: "Tempo esgotado" }),
		).toBeVisible();
		expect(screen.getByText("Ainda não acabou!")).toBeVisible();
	});

	it("waits for the result when only the stage has arrived", () => {
		renderStage(results(null));

		expect(mark()).toBeUndefined();
		expect(screen.queryByRole("heading")).toBeNull();
	});

	it("shows the final screen at the end of the game (spec 011)", () => {
		renderStage(null, {
			finished: true,
			final: {
				title: "Capitais",
				rank: 4,
				total: 1500,
				revealRemainingMs: 0,
			},
		});

		expect(
			screen.getByRole("heading", { name: "Você ficou em 4º lugar" }),
		).toBeVisible();
		expect(slot("player-total")).toBe("1500");
	});

	it("the footer's total ends at the new value when it goes up (spec 011)", async () => {
		const view = render(
			<PlayerStage
				nickname="ACT"
				finished={false}
				final={null}
				stage={stageAt({ answered: true, total: 639 })}
				receivedAt={Date.now()}
				late={false}
				notice={null}
				onAnswer={vi.fn()}
				onLeave={vi.fn()}
			/>,
		);
		expect(slot("player-total")).toBe("639");

		view.rerender(
			<PlayerStage
				nickname="ACT"
				finished={false}
				final={null}
				stage={results("correct", { points: 701 }, { total: 1340 })}
				receivedAt={Date.now()}
				late={false}
				notice={null}
				onAnswer={vi.fn()}
				onLeave={vi.fn()}
			/>,
		);

		await waitFor(() => expect(slot("player-total")).toBe("1340"));
		await waitFor(() => expect(slot("answer-points")).toBe("+ 701"));
	});

	it("tells the points, the streak, the place and the total (spec 010)", async () => {
		renderStage(results("correct"));

		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		expect(screen.getByText("Sequência de respostas")).toBeVisible();
		expect(slot("answer-streak")).toBe("2");
		// The points count up from zero (spec 011, RN-35).
		await waitFor(() => expect(slot("answer-points")).toBe("+ 639"));
		expect(slot("player-position")).toBe("Você está no pódio!");
		expect(slot("player-total")).toBe("1340");
	});

	it("tells the place and who is ahead outside the podium", () => {
		renderStage(
			results("correct", {
				rank: 5,
				behind: { nickname: "Bia", points: 120 },
			}),
		);

		expect(slot("player-position")).toBe(
			"Você está em 5º lugar120 pontos atrás de Bia",
		);
	});

	it.each(["wrong", "timeout"] as const)(
		"shows no points and no streak for a %s answer, only the place",
		(result) => {
			renderStage(results(result));

			expect(slot("answer-points")).toBeNull();
			expect(slot("answer-streak")).toBeNull();
			expect(screen.queryByText("Sequência de respostas")).toBeNull();
			expect(slot("player-position")).toBe("Você está no pódio!");
			expect(slot("player-total")).toBe("1340");
		},
	);

	it("shows a right answer of a no-points question without the points", () => {
		renderStage(results("correct", { points: null, streak: 3 }));

		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		expect(slot("answer-streak")).toBe("3");
		expect(slot("answer-points")).toBeNull();
	});

	it("keeps the result on the phone during the host's scoreboard", async () => {
		renderStage(results("correct", {}, { phase: "scoreboard" }));

		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		await waitFor(() => expect(slot("answer-points")).toBe("+ 639"));
	});

	it("shows the total, and nothing about the answer just sent, while waiting", () => {
		renderStage(stageAt({ answered: true, total: 1354 }));

		expect(slot("player-total")).toBe("1354");
		expect(slot("answer-points")).toBeNull();
		expect(slot("player-position")).toBeNull();
	});
});

describe("PlayerStage: who joined in the middle (spec 012)", () => {
	it("who joined in the middle waits for the next question", () => {
		renderStage(stageAt({ sittingOut: true, question: null }));

		expect(screen.getByRole("heading", { name: "Você entrou!" })).toBeVisible();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Aguarde a próxima pergunta.",
		);
		expect(buttons()).toHaveLength(0);
		expect(screen.queryByText("Prepare-se!")).toBeNull();
	});

	it("shows the total zero and no time over to who joined in the middle", () => {
		for (const phase of ["answering", "results", "scoreboard"] as const) {
			const view = render(
				<PlayerStage
					nickname="Caio"
					finished={false}
					final={null}
					stage={stageAt({
						phase,
						sittingOut: true,
						question: null,
						remainingMs: null,
					})}
					receivedAt={Date.now()}
					late={false}
					notice={null}
					onAnswer={vi.fn()}
					onLeave={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: "Você entrou!" }),
			).toBeVisible();
			expect(screen.queryByText("Tempo esgotado")).toBeNull();
			expect(
				document.querySelector('[data-slot="player-total"]'),
			).toHaveTextContent("0");
			expect(
				document.querySelector('[data-slot="player-nickname"]'),
			).toHaveTextContent("Caio");
			view.unmount();
		}
	});

	it("a refused answer does not turn the wait into time over", () => {
		renderStage(stageAt({ sittingOut: true, question: null }), { late: true });

		expect(screen.queryByText("Tempo esgotado")).toBeNull();
		expect(screen.getByRole("heading", { name: "Você entrou!" })).toBeVisible();
	});
});

describe("PlayerStage: the question on the device (spec 012)", () => {
	const image = {
		url: "https://media.test/mapa.png",
		placement: "media" as const,
		crop: { shape: "square" as const, zoom: 1.5, x: 0.5, y: 0.5 },
		altText: "Mapa do Brasil",
	};

	it("the intro shows the statement and the reading bar", async () => {
		vi.useFakeTimers();
		renderStage(
			stageAt({
				phase: "questionIntro",
				durationMs: 5_000,
				remainingMs: 5_000,
				// The answers come only when they open.
				question: onDevice({
					choices: onDevice().choices.map((choice) => ({
						...choice,
						text: null,
					})),
				}),
			}),
		);

		expect(screen.getByRole("heading", { name: STATEMENT })).toBeVisible();
		expect(screen.queryByText("Preparar…")).toBeNull();
		expect(screen.queryByRole("heading", { name: "Pergunta 2" })).toBeNull();
		expect(buttons()).toHaveLength(0);
		const bar = screen.getByRole("progressbar", { name: "Tempo de leitura" });
		expect(bar).toHaveAttribute("aria-valuenow", "0");

		await act(() => vi.advanceTimersByTimeAsync(2_500));
		expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(
			40,
		);
	});

	it("the answers show the statement, the texts and the shapes", async () => {
		const { onAnswer, user } = renderStage(stageAt({ question: onDevice() }));

		expect(screen.getByRole("heading", { name: STATEMENT })).toBeVisible();
		expect(buttons().map((button) => button.textContent)).toEqual(TEXTS);
		expect(buttons().map((button) => button.dataset.shape)).toEqual([
			"triangle",
			"diamond",
			"circle",
			"square",
		]);

		await user.click(screen.getByRole("button", { name: "Brasília" }));
		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-1"]);
	});

	it("the answers show the image with its crop above the statement", () => {
		renderStage(stageAt({ question: onDevice({ image }) }));

		const picture = screen.getByRole("img", { name: "Mapa do Brasil" });
		expect(picture).toHaveAttribute("src", image.url);
		expect(
			document.querySelector('[data-slot="question-image"]'),
		).toHaveAttribute("data-crop", "square");
		const statement = screen.getByRole("heading", { name: STATEMENT });
		expect(
			picture.compareDocumentPosition(statement) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			document.querySelector('[data-slot="device-question-background"]'),
		).toBeNull();
	});

	it("lays the question out as in Kahoot: image, statement, answers, time", () => {
		renderStage(stageAt({ question: onDevice({ image }) }));

		const inOrder = [
			document.querySelector('[data-slot="device-question-image"]'),
			screen.getByRole("heading", { name: STATEMENT }),
			screen.getByRole("group", { name: "Respostas" }),
			screen.getByRole("timer", { name: "Tempo restante" }),
		] as HTMLElement[];
		for (const [index, element] of inOrder.entries()) {
			const next = inOrder[index + 1];
			if (next) {
				expect(
					element.compareDocumentPosition(next) &
						Node.DOCUMENT_POSITION_FOLLOWING,
				).toBeTruthy();
			}
		}
		// The image takes what is left of the screen; the answers keep their size.
		expect(inOrder[0]?.className).toMatch(/flex-1/);
		expect(inOrder[2]?.parentElement?.className).not.toMatch(/flex-1/);
	});

	it("keeps the answers at the bottom without an image", () => {
		renderStage(stageAt({ question: onDevice() }));

		const room = document.querySelector('[data-slot="device-question-image"]');
		expect(room?.className).toMatch(/flex-1/);
		expect(room?.querySelector("img")).toBeNull();
	});

	it("shows a background image behind the whole phone", () => {
		renderStage(
			stageAt({
				question: onDevice({ image: { ...image, placement: "background" } }),
			}),
		);

		const background = document.querySelector(
			'[data-slot="device-question-background"]',
		);
		expect(background?.querySelector("img")).toHaveAttribute("src", image.url);
		expect(background?.querySelector("img")).toHaveAttribute(
			"alt",
			"Mapa do Brasil",
		);
		// Not in the middle too.
		expect(document.querySelector('[data-slot="question-image"]')).toBeNull();
		expect(screen.getByRole("heading", { name: STATEMENT })).toBeVisible();
	});

	it("shows no image and no statement with the option off", () => {
		renderStage(stageAt());

		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.queryByRole("timer")).toBeNull();
		expect(buttons().every((button) => button.textContent === "")).toBe(true);
	});

	it("the time bar counts the seconds left", async () => {
		vi.useFakeTimers();
		renderStage(
			stageAt({
				durationMs: 30_000,
				remainingMs: 30_000,
				question: onDevice(),
			}),
		);
		const timer = screen.getByRole("timer", { name: "Tempo restante" });
		expect(timer).toHaveTextContent("30");

		await act(() => vi.advanceTimersByTimeAsync(2_000));

		expect(timer).toHaveTextContent("28");
	});

	it("true or false shows its two texts", () => {
		renderStage(
			stageAt({
				question: {
					type: "trueFalse",
					selection: "single",
					text: "A capital do Brasil é Brasília",
					image: null,
					choices: [
						{
							id: "true",
							shapeIndex: 1,
							label: "Verdadeiro",
							text: "Verdadeiro",
						},
						{ id: "false", shapeIndex: 0, label: "Falso", text: "Falso" },
					],
				},
			}),
		);

		expect(buttons().map((button) => button.textContent)).toEqual([
			"Verdadeiro",
			"Falso",
		]);
	});

	it("the texts fit a narrow screen", () => {
		const statement = "Pergunta comprida ".repeat(7).slice(0, 120);
		const long = "Uma alternativa bem comprida, ".repeat(3).slice(0, 75);
		renderStage(
			stageAt({
				question: onDevice(
					{ text: statement, image },
					Array.from({ length: 6 }, () => long),
				),
			}),
		);

		expect(buttons()).toHaveLength(6);
		expect(screen.getByRole("heading", { name: statement }).className).toMatch(
			/break-words/,
		);
		// The image gives way to the buttons: it may shrink, they may not.
		expect(
			document.querySelector('[data-slot="device-question-image"]')?.className,
		).toMatch(/min-h-0/);
		expect(screen.getByRole("timer", { name: "Tempo restante" })).toBeVisible();
	});

	it("keeps the wait and the result as they are", () => {
		const view = render(
			<PlayerStage
				nickname="ACT"
				finished={false}
				final={null}
				stage={stageAt({ question: onDevice(), answered: true })}
				receivedAt={Date.now()}
				late={false}
				notice={null}
				onAnswer={vi.fn()}
				onLeave={vi.fn()}
			/>,
		);

		expect(screen.getByRole("status")).toBeVisible();
		expect(buttons()).toHaveLength(0);
		expect(screen.queryByRole("timer")).toBeNull();
		view.unmount();
	});
});
