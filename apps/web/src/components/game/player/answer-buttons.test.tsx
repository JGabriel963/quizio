import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlayerQuestionData } from "@/lib/api-types";

import { AnswerButtons } from "./answer-buttons";

const TEXTS = ["Brasília", "Rio de Janeiro", "Salvador", "Recife"];

function quiz(
	options: {
		selection?: PlayerQuestionData["selection"];
		texts?: readonly string[] | null;
	} = {},
): PlayerQuestionData {
	const texts = options.texts === undefined ? null : options.texts;
	return {
		type: "quiz",
		selection: options.selection ?? "single",
		text: texts ? "Qual é a capital do Brasil?" : null,
		image: null,
		choices: (texts ?? TEXTS).map((text, index) => ({
			id: `choice-${index + 1}`,
			shapeIndex: index,
			label: null,
			text: texts ? text : null,
		})),
	};
}

const trueFalse = (withTexts: boolean): PlayerQuestionData => ({
	type: "trueFalse",
	selection: "single",
	text: withTexts ? "A capital do Brasil é Brasília" : null,
	image: null,
	choices: [
		{
			id: "true",
			shapeIndex: 1,
			label: "Verdadeiro",
			text: withTexts ? "Verdadeiro" : null,
		},
		{
			id: "false",
			shapeIndex: 0,
			label: "Falso",
			text: withTexts ? "Falso" : null,
		},
	],
});

function renderButtons(question: PlayerQuestionData) {
	const onAnswer = vi.fn();
	const user = userEvent.setup();
	render(<AnswerButtons question={question} onAnswer={onAnswer} />);
	const buttons = () =>
		[
			...document.querySelectorAll('[data-slot="answer-button"]'),
		] as HTMLElement[];
	return { onAnswer, user, buttons };
}

const send = () => screen.queryByRole("button", { name: "Enviar" });

describe("AnswerButtons: single selection (spec 009)", () => {
	it("shows shapes only without the texts", () => {
		const { buttons } = renderButtons(quiz());

		expect(
			buttons().map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"Triângulo vermelho",
			"Losango azul",
			"Círculo amarelo",
			"Quadrado verde",
		]);
		expect(buttons().every((button) => button.textContent === "")).toBe(true);
		expect(buttons().every((button) => button.dataset.format === "shape")).toBe(
			true,
		);
	});

	it("a single selection answers with one tap", async () => {
		const { onAnswer, user } = renderButtons(quiz());

		await user.click(screen.getByRole("button", { name: "Losango azul" }));

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-2"]);
		expect(send()).toBeNull();
		expect(screen.queryByText("Selecione uma ou mais respostas!")).toBeNull();
		expect(document.querySelector('[data-slot="answer-marker"]')).toBeNull();
	});
});

describe("AnswerButtons: the texts on the device (spec 012)", () => {
	it("shows the shape in the corner and the text", async () => {
		const { buttons, onAnswer, user } = renderButtons(quiz({ texts: TEXTS }));

		expect(buttons().map((button) => button.textContent)).toEqual(TEXTS);
		expect(buttons().map((button) => button.dataset.shape)).toEqual([
			"triangle",
			"diamond",
			"circle",
			"square",
		]);
		for (const button of buttons()) {
			expect(button.dataset.format).toBe("text");
			expect(
				button.querySelector('[data-slot="answer-button-shape"]'),
			).not.toBeNull();
		}

		// The text names the button: no shape name on top of it.
		await user.click(screen.getByRole("button", { name: "Salvador" }));
		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-3"]);
	});

	it("true or false shows its two labels", async () => {
		const { buttons, onAnswer, user } = renderButtons(trueFalse(true));

		expect(buttons().map((button) => button.textContent)).toEqual([
			"Verdadeiro",
			"Falso",
		]);
		expect(buttons().map((button) => button.dataset.shape)).toEqual([
			"diamond",
			"triangle",
		]);

		await user.click(screen.getByRole("button", { name: "Falso" }));
		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["false"]);
	});

	it("true or false without the texts keeps its names for screen readers", () => {
		const { buttons } = renderButtons(trueFalse(false));

		expect(
			buttons().map((button) => button.getAttribute("aria-label")),
		).toEqual(["Verdadeiro", "Falso"]);
		expect(buttons().every((button) => button.textContent === "")).toBe(true);
	});

	it("long texts wrap inside the button", () => {
		const long = "Uma alternativa bem comprida, ".repeat(3).slice(0, 75);
		const { buttons } = renderButtons(
			quiz({ texts: Array.from({ length: 6 }, () => long) }),
		);

		expect(buttons()).toHaveLength(6);
		for (const button of buttons()) {
			const text = button.querySelector('[data-slot="answer-button-text"]');
			expect(text).toHaveTextContent(long);
			expect(text?.className).toMatch(/break-words/);
		}
		// The list scrolls down if it has to, never sideways (CA-25).
		const list = screen.getByRole("group", { name: "Respostas" });
		expect(list.className).toMatch(/grid-cols-2/);
		expect(list.parentElement?.className).toMatch(/overflow-y-auto/);
		expect(list.parentElement?.className).toMatch(/overflow-x-hidden/);
	});
});

describe("AnswerButtons: multiple selection (spec 012)", () => {
	const marked = (buttons: HTMLElement[]) =>
		buttons.map((button) => button.getAttribute("aria-pressed"));

	it("shows the notice of the multiple selection", () => {
		const { buttons } = renderButtons(quiz({ selection: "multiple" }));

		expect(screen.getByText("Selecione uma ou mais respostas!")).toBeVisible();
		for (const button of buttons()) {
			expect(
				button.querySelector('[data-slot="answer-marker"]'),
			).not.toBeNull();
		}
		expect(marked(buttons())).toEqual(["false", "false", "false", "false"]);
	});

	it("a multiple selection marks and unmarks without sending", async () => {
		const { buttons, onAnswer, user } = renderButtons(
			quiz({ selection: "multiple" }),
		);

		await user.click(
			screen.getByRole("button", { name: "Triângulo vermelho" }),
		);
		await user.click(screen.getByRole("button", { name: "Círculo amarelo" }));
		expect(marked(buttons())).toEqual(["true", "false", "true", "false"]);

		await user.click(
			screen.getByRole("button", { name: "Triângulo vermelho" }),
		);

		expect(marked(buttons())).toEqual(["false", "false", "true", "false"]);
		expect(onAnswer).not.toHaveBeenCalled();
	});

	it("sends everything marked", async () => {
		const { onAnswer, user } = renderButtons(quiz({ selection: "multiple" }));

		// Whatever the order of the taps, the answers go in the order of the screen.
		await user.click(screen.getByRole("button", { name: "Quadrado verde" }));
		await user.click(screen.getByRole("button", { name: "Losango azul" }));
		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-2", "choice-4"]);
	});

	it("send is disabled with nothing marked", async () => {
		const { onAnswer, user } = renderButtons(quiz({ selection: "multiple" }));

		expect(send()).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Losango azul" }));
		expect(send()).toBeEnabled();

		await user.click(screen.getByRole("button", { name: "Losango azul" }));
		expect(send()).toBeDisabled();
		expect(onAnswer).not.toHaveBeenCalled();
	});

	it("marks with the texts on the device too", async () => {
		const { onAnswer, user } = renderButtons(
			quiz({ selection: "multiple", texts: TEXTS }),
		);

		await user.click(screen.getByRole("button", { name: "Brasília" }));
		const pressed = screen.getByRole("button", { name: "Brasília" });
		expect(pressed).toHaveAttribute("aria-pressed", "true");
		expect(
			pressed.querySelector('[data-slot="answer-marker"]'),
		).toHaveAttribute("data-marked", "true");

		await user.click(screen.getByRole("button", { name: "Enviar" }));
		expect(onAnswer).toHaveBeenCalledExactlyOnceWith(["choice-1"]);
	});
});
