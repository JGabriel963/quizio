import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TrueFalseAnswers } from "./true-false-answers";

function renderAnswers(correct: boolean | null, showHint = true) {
	const onCorrectChange = vi.fn();
	render(
		<TrueFalseAnswers
			correct={correct}
			showHint={showHint}
			onCorrectChange={onCorrectChange}
		/>,
	);
	return { onCorrectChange, user: userEvent.setup() };
}

const mark = (name: "Verdadeiro" | "Falso") =>
	screen.getByRole("checkbox", { name: `${name} correta` });

describe("TrueFalseAnswers", () => {
	it("shows Verdadeiro then Falso, fixed, with nothing marked and the hint", () => {
		renderAnswers(null);

		const answers = within(
			screen.getByRole("list", { name: "Respostas" }),
		).getAllByRole("listitem");
		expect(answers.map((answer) => answer.textContent)).toEqual([
			"Verdadeiro",
			"Falso",
		]);
		expect(
			answers.map(
				(answer) =>
					answer
						.querySelector("[data-slot=answer-shape]")
						?.getAttribute("data-shape") ?? null,
			),
		).toEqual(["diamond", "triangle"]);
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(mark("Verdadeiro")).not.toBeChecked();
		expect(mark("Falso")).not.toBeChecked();
		expect(screen.getByText("Marque a resposta correta")).toBeInTheDocument();
	});

	it("shows no hint while the question is just started", () => {
		renderAnswers(null, false);

		expect(screen.queryByText("Marque a resposta correta")).toBeNull();
		expect(mark("Verdadeiro")).not.toBeChecked();
	});

	it("marking one asks for that answer", async () => {
		const { onCorrectChange, user } = renderAnswers(null);

		await user.click(mark("Falso"));

		expect(onCorrectChange).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("marking the other one switches to it", async () => {
		const { onCorrectChange, user } = renderAnswers(true);

		await user.click(mark("Falso"));

		expect(onCorrectChange).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("unmarking the marked one asks for the other", async () => {
		const { onCorrectChange, user } = renderAnswers(false);

		await user.click(mark("Falso"));

		expect(onCorrectChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("shows the marked answer and hides the hint", () => {
		renderAnswers(true);

		expect(mark("Verdadeiro")).toBeChecked();
		expect(mark("Falso")).not.toBeChecked();
		expect(
			screen.queryByText("Marque a resposta correta"),
		).not.toBeInTheDocument();
	});
});
