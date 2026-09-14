import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnswerOption } from "./answer-option";
import { ANSWER_SHAPES, answerShapeAt } from "./answer-shape";

describe("answerShapeAt", () => {
	it("follows Kahoot's fixed order: triangle, diamond, circle, square", () => {
		expect(ANSWER_SHAPES.map((_, index) => answerShapeAt(index))).toEqual([
			"triangle",
			"diamond",
			"circle",
			"square",
		]);
	});

	it.each([-1, 4])("rejects position %s", (index) => {
		expect(() => answerShapeAt(index)).toThrow(RangeError);
	});
});

describe("AnswerOption", () => {
	it.each([
		["triangle", "bg-answer-red"],
		["diamond", "bg-answer-blue"],
		["circle", "bg-answer-yellow"],
		["square", "bg-answer-green"],
	] as const)("derives the %s color from its shape", (shape, colorClass) => {
		render(<AnswerOption shape={shape}>Pedro</AnswerOption>);

		const option = screen.getByRole("button", { name: "Pedro" });
		expect(option).toHaveClass(colorClass);
		expect(option.querySelector(`[data-shape="${shape}"]`)).not.toBeNull();
	});

	it("exposes the selected state to assistive technology", () => {
		render(
			<AnswerOption shape="circle" state="selected">
				Barnabé
			</AnswerOption>,
		);

		const option = screen.getByRole("button", { name: "Barnabé" });
		expect(option).toHaveAttribute("aria-pressed", "true");
		expect(option).toHaveAttribute("data-state", "selected");
	});

	it("reports taps to the player", async () => {
		const onClick = vi.fn();
		render(
			<AnswerOption shape="square" onClick={onClick}>
				Estêvão
			</AnswerOption>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Estêvão" }));

		expect(onClick).toHaveBeenCalledOnce();
	});
});
