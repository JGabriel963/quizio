import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayerQuestionData, PlayerStageData } from "@/lib/api-types";

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
		result: null,
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
	const results = (result: PlayerStageData["result"]) =>
		stageAt({ phase: "results", durationMs: null, remainingMs: null, result });
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
});
