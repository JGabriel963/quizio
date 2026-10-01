import { act, render, screen } from "@testing-library/react";
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
		choices: Array.from({ length: count }, (_, index) => ({
			id: `choice-${index + 1}`,
			shapeIndex: index,
			label: null,
		})),
	};
}

const trueFalse: PlayerQuestionData = {
	type: "trueFalse",
	selection: "single",
	choices: [
		{ id: "true", shapeIndex: 1, label: "Verdadeiro" },
		{ id: "false", shapeIndex: 0, label: "Falso" },
	],
};

function stageAt(overrides: Partial<PlayerStageData> = {}): PlayerStageData {
	return {
		questionIndex: 1,
		questionCount: 10,
		phase: "answering",
		durationMs: 20_000,
		remainingMs: 20_000,
		question: quiz(),
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
			stage={stage}
			receivedAt={Date.now()}
			late={false}
			notice={null}
			onAnswer={onAnswer}
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

	it("a tap is the answer in multiple selection too, with no Enviar", async () => {
		const { onAnswer, user } = renderStage(
			stageAt({ question: quiz(4, "multiple") }),
		);

		expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "Losango azul" }));

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-2"]);
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

	it("thanks the player at the end of the game", () => {
		renderStage(null, { finished: true });

		expect(screen.getByRole("heading", { name: "Fim do jogo" })).toBeVisible();
		expect(screen.getByText("Obrigado por jogar!")).toBeVisible();
	});

	it("tells the points, the streak, the place and the total (spec 010)", () => {
		renderStage(results("correct"));

		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		expect(screen.getByText("Sequência de respostas")).toBeVisible();
		expect(slot("answer-streak")).toBe("2");
		expect(slot("answer-points")).toBe("+ 639");
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

	it("keeps the result on the phone during the host's scoreboard", () => {
		renderStage(results("correct", {}, { phase: "scoreboard" }));

		expect(screen.getByRole("heading", { name: "Correto" })).toBeVisible();
		expect(slot("answer-points")).toBe("+ 639");
	});

	it("shows the total, and nothing about the answer just sent, while waiting", () => {
		renderStage(stageAt({ answered: true, total: 1354 }));

		expect(slot("player-total")).toBe("1354");
		expect(slot("answer-points")).toBeNull();
		expect(slot("player-position")).toBeNull();
	});
});
