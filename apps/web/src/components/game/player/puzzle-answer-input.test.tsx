import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PuzzleAnswerInput } from "./puzzle-answer-input";

/** The rivers as the game drew them: Yangtzé took the red triangle. */
const drawn = [
	{ id: "choice-3", shapeIndex: 0, text: "Yangtzé" },
	{ id: "choice-4", shapeIndex: 1, text: "Mississipi" },
	{ id: "choice-1", shapeIndex: 2, text: "Nilo" },
	{ id: "choice-2", shapeIndex: 3, text: "Amazonas" },
];

function renderInput(
	choices: { id: string; shapeIndex: number; text: string | null }[] = drawn,
	initialOrder?: string[],
) {
	const onSubmit = vi.fn();
	render(
		<PuzzleAnswerInput
			choices={choices}
			initialOrder={initialOrder}
			onSubmit={onSubmit}
		/>,
	);
	return { onSubmit, user: userEvent.setup() };
}

const blocks = () =>
	[...document.querySelectorAll("[data-slot=puzzle-block]")] as HTMLElement[];

describe("PuzzleAnswerInput (spec 033)", () => {
	it("shows the hint, the blocks in the received order and an enabled Enviar", () => {
		renderInput();

		expect(
			screen.getByText("Arraste os blocos para os organizar na ordem certa."),
		).toBeInTheDocument();
		expect(blocks().map((block) => block.textContent)).toEqual([
			"Yangtzé",
			"Mississipi",
			"Nilo",
			"Amazonas",
		]);
		expect(blocks()[0]).toHaveClass("bg-answer-red");
		expect(blocks()[2]).toHaveClass("bg-answer-yellow");
		expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
	});

	it("without the texts the blocks have only shapes", () => {
		renderInput(drawn.map((choice) => ({ ...choice, text: null })));

		expect(blocks().map((block) => block.textContent)).toEqual([
			"",
			"",
			"",
			"",
		]);
		expect(
			screen.getByRole("button", { name: "Mover bloco 3" }),
		).toBeInTheDocument();
	});

	it("the keyboard reorders and Enviar sends the ids in the new order", async () => {
		const { onSubmit, user } = renderInput();

		screen.getByRole("button", { name: "Mover Nilo" }).focus();
		await user.keyboard("{ArrowUp}{ArrowUp}");

		expect(blocks().map((block) => block.textContent)).toEqual([
			"Nilo",
			"Yangtzé",
			"Mississipi",
			"Amazonas",
		]);
		// Each block keeps its color and shape (RN-15).
		expect(blocks()[0]).toHaveClass("bg-answer-yellow");
		expect(
			screen.getByText("Nilo movido para a posição 1 de 4."),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith([
			"choice-1",
			"choice-3",
			"choice-4",
			"choice-2",
		]);
	});

	it("sending without moving sends the received order", async () => {
		const { onSubmit, user } = renderInput();

		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onSubmit).toHaveBeenCalledWith([
			"choice-3",
			"choice-4",
			"choice-1",
			"choice-2",
		]);
	});

	it("a lost answer gives the blocks back in the order they were", () => {
		renderInput(drawn, ["choice-1", "choice-2", "choice-3", "choice-4"]);

		expect(blocks().map((block) => block.textContent)).toEqual([
			"Nilo",
			"Amazonas",
			"Yangtzé",
			"Mississipi",
		]);
	});
});
