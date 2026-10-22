import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PuzzleAnswering, PuzzleResults } from "./puzzle-results";

/** The rivers as the game drew them: Yangtzé took the red triangle. */
const drawn = [
	{ id: "choice-3", shapeIndex: 0, text: "Yangtzé", correct: null },
	{ id: "choice-4", shapeIndex: 1, text: "Mississipi", correct: null },
	{ id: "choice-1", shapeIndex: 2, text: "Nilo", correct: null },
	{ id: "choice-2", shapeIndex: 3, text: "Amazonas", correct: null },
];
const results = {
	order: ["choice-1", "choice-2", "choice-3", "choice-4"],
	correct: 3,
	wrong: 2,
};
const image = {
	url: "https://media.test/rio.png",
	placement: "media" as const,
	crop: null,
	altText: "Um rio",
};

const blocks = (container: HTMLElement = document.body) =>
	[...container.querySelectorAll("[data-slot=puzzle-block]")] as HTMLElement[];

describe("PuzzleAnswering (spec 033, RN-25)", () => {
	it("a puzzle shows the choices stacked in the drawn order", () => {
		render(<PuzzleAnswering choices={drawn} />);

		const list = screen.getByRole("list", { name: "Respostas" });
		expect(blocks(list).map((block) => block.textContent)).toEqual([
			"Yangtzé",
			"Mississipi",
			"Nilo",
			"Amazonas",
		]);
		expect(blocks(list)[0]).toHaveClass("bg-answer-red");
		expect(within(list).queryByRole("button")).toBeNull();
	});
});

describe("PuzzleResults (spec 033, RN-26, RN-27)", () => {
	it("shows the right order with the game's shapes and ticks", () => {
		render(
			<PuzzleResults
				choices={drawn}
				results={results}
				image={null}
				animate={false}
			/>,
		);

		const list = screen.getByRole("list", { name: "Ordem correta" });
		expect(blocks(list).map((block) => block.textContent)).toEqual([
			"Nilo",
			"Amazonas",
			"Yangtzé",
			"Mississipi",
		]);
		// Nilo keeps the yellow circle it was drawn with.
		expect(blocks(list)[0]).toHaveClass("bg-answer-yellow");
		expect(list.querySelectorAll("svg.lucide-check")).toHaveLength(4);
	});

	it("shows the right and wrong bars", () => {
		render(
			<PuzzleResults
				choices={drawn}
				results={results}
				image={null}
				animate={false}
			/>,
		);

		expect(screen.getByLabelText("3 acertaram")).toHaveTextContent("3");
		expect(screen.getByLabelText("2 erraram")).toHaveTextContent("2");
	});

	it("Mostrar mídia shows the image", async () => {
		const user = userEvent.setup();
		render(
			<PuzzleResults
				choices={drawn}
				results={results}
				image={image}
				animate={false}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Mostrar mídia" }));

		expect(screen.getByRole("img", { name: "Um rio" })).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Ordem correta" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "Ocultar mídia" }));
		expect(screen.getByRole("list", { name: "Ordem correta" })).toBeVisible();
	});

	it("without media there is no Mostrar mídia", () => {
		render(
			<PuzzleResults
				choices={drawn}
				results={results}
				image={null}
				animate={false}
			/>,
		);

		expect(screen.queryByRole("button", { name: "Mostrar mídia" })).toBeNull();
	});
});
