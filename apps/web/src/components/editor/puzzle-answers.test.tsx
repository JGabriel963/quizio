import {
	blankQuestion,
	type PuzzleQuestion,
} from "@quizio/core/quiz/domain/question";
import {
	applyQuestionChange,
	type QuestionChange,
} from "@quizio/core/quiz/domain/question-change";
import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SaveTrackerProvider } from "@/lib/save-tracker";
import {
	editorOf,
	formattedField,
	typeInEditor,
} from "@/testing/formatted-text-editor";

import { DraggedAnswer, PuzzleAnswers } from "./puzzle-answers";

async function renderAnswers(
	items: (string | null)[] = [null, null, null, null],
	itemFormatting: TextFormatting[] = [{}, {}, {}, {}],
) {
	const onSaveItem = vi.fn(async () => {});
	const onChange = vi.fn();
	const question = { ...blankQuestion("q1", "puzzle"), items, itemFormatting };
	const view = render(
		<SaveTrackerProvider>
			<button type="button">Fora</button>
			<PuzzleAnswers
				question={question}
				onSaveItem={onSaveItem}
				onChange={onChange}
			/>
		</SaveTrackerProvider>,
	);
	await mounted();
	return { onSaveItem, onChange, user: userEvent.setup(), ...view };
}

const field = (position: number) =>
	screen.getByRole("textbox", { name: `Resposta ${position}` });
/** Every field once its editor has mounted. */
const mounted = () =>
	Promise.all(
		[1, 2, 3, 4].map((position) => formattedField(() => field(position))),
	);

describe("PuzzleAnswers (spec 033)", () => {
	it("shows the four placeholders, the shapes and the hint", async () => {
		await renderAnswers();

		expect(field(1)).toHaveAttribute(
			"aria-placeholder",
			"Adicionar resposta 1",
		);
		expect(field(3)).toHaveAttribute(
			"aria-placeholder",
			"Adicionar resposta 3",
		);
		expect(field(4)).toHaveAttribute(
			"aria-placeholder",
			"Adicionar resposta 4 (opcional)",
		);
		expect(
			document.querySelectorAll("[data-slot=puzzle-position-shape]"),
		).toHaveLength(4);
		expect(
			screen.getByText(
				"Adicione no mínimo 3 respostas na ordem correta. Elas serão embaralhadas automaticamente durante o jogo.",
			),
		).toBeInTheDocument();
	});

	it("a filled slot takes the position's color and shows the counter", async () => {
		await renderAnswers();
		act(() => field(2).focus());

		typeInEditor(field(2), "A");

		const row = field(2).closest("[data-slot=puzzle-answer]");
		expect(row).toHaveClass("bg-answer-blue");
		expect(screen.getByText("74")).toBeInTheDocument();
		expect(field(1).closest("[data-slot=puzzle-answer]")).toHaveClass(
			"bg-card",
		);
	});

	it("does not take a 76th character", async () => {
		await renderAnswers();
		act(() => field(1).focus());

		act(() => editorOf(field(1)).view.pasteText("a".repeat(80)));

		expect(field(1).textContent).toBe("a".repeat(75));
	});

	it("saves the slot's text and formatting", async () => {
		const { onSaveItem, user } = await renderAnswers();
		act(() => field(1).focus());
		typeInEditor(field(1), "H2O");
		act(() => {
			editorOf(field(1)).commands.setTextSelection({ from: 2, to: 3 });
			editorOf(field(1)).commands.toggleSubscript();
		});

		await user.click(screen.getByRole("button", { name: "Fora" }));

		expect(onSaveItem).toHaveBeenLastCalledWith(0, {
			text: "H2O",
			formatting: { subscript: [[1, 2]] },
		});
	});

	it("the toolbar goes above the first answer only", async () => {
		await renderAnswers(["Nilo", "Amazonas", null, null]);

		act(() => field(1).focus());
		expect(
			screen.getByRole("toolbar", { name: "Formatação da resposta 1" }),
		).toHaveClass("bottom-full");
		act(() => field(2).focus());
		expect(
			screen.getByRole("toolbar", { name: "Formatação da resposta 2" }),
		).toHaveClass("top-full");
	});

	it("the keyboard moves a slot one place up and sends puzzleItemMoved", async () => {
		const { onChange, user } = await renderAnswers([
			"Nilo",
			"Amazonas",
			"Yangtzé",
			"Mississipi",
		]);

		screen.getByRole("button", { name: "Mover Mississipi" }).focus();
		await user.keyboard("{ArrowUp}");

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "puzzleItemMoved",
			from: 3,
			to: 2,
		});
		expect(
			screen.getByText("Mississipi movido para a posição 3 de 4."),
		).toHaveAttribute("role", "status");
	});

	it("the keyboard does not move past the ends", async () => {
		const { onChange, user } = await renderAnswers([
			"Nilo",
			"Amazonas",
			"Yangtzé",
			null,
		]);

		screen.getByRole("button", { name: "Mover Nilo" }).focus();
		await user.keyboard("{ArrowUp}");

		expect(onChange).not.toHaveBeenCalled();
	});
});

/** The editor's cache: a change reaches the question one render later. */
function LaggingEditor({ initial }: { initial: PuzzleQuestion }) {
	const [question, setQuestion] = useState(initial);
	return (
		<SaveTrackerProvider>
			<PuzzleAnswers
				question={question}
				onSaveItem={async () => {}}
				onChange={(change: QuestionChange) =>
					setTimeout(() =>
						setQuestion(
							(current) =>
								applyQuestionChange(current, change).question as PuzzleQuestion,
						),
					)
				}
			/>
		</SaveTrackerProvider>
	);
}

describe("PuzzleAnswers with the editor's cache (spec 033, RN-05)", () => {
	it("the fields show the moved texts at once and keep them", async () => {
		render(
			<LaggingEditor
				initial={{
					...blankQuestion("q1", "puzzle"),
					items: ["Nilo", "Amazonas", "Yangtzé", null],
				}}
			/>,
		);
		await mounted();
		const user = userEvent.setup();

		screen.getByRole("button", { name: "Mover Amazonas" }).focus();
		await user.keyboard("{ArrowUp}");
		await mounted();

		expect(field(1)).toHaveTextContent("Amazonas");
		expect(field(2)).toHaveTextContent("Nilo");
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Mover Amazonas" }),
			).toHaveFocus(),
		);
		await new Promise((resolve) => setTimeout(resolve, 10));
		await mounted();
		expect(field(1)).toHaveTextContent("Amazonas");
		expect(field(3)).toHaveTextContent("Yangtzé");
	});

	it("a moved answer keeps its formatting (spec 048, RN-11)", async () => {
		render(
			<LaggingEditor
				initial={{
					...blankQuestion("q1", "puzzle"),
					items: ["Sal", "H2O", "Ar", null],
					itemFormatting: [{}, { subscript: [[1, 2]] }, {}, {}],
				}}
			/>,
		);
		await mounted();
		const user = userEvent.setup();

		screen.getByRole("button", { name: "Mover H2O" }).focus();
		await user.keyboard("{ArrowUp}");
		await mounted();

		expect(field(1)).toHaveTextContent("H2O");
		expect(field(1).querySelector("sub")).toHaveTextContent("2");
		await new Promise((resolve) => setTimeout(resolve, 10));
		await mounted();
		expect(field(1).querySelector("sub")).toHaveTextContent("2");
		expect(field(2).querySelector("sub")).toBeNull();
	});
});

describe("DraggedAnswer (spec 048)", () => {
	it("the dragged copy shows the formatting", () => {
		render(
			<DraggedAnswer
				index={0}
				text="H2O"
				formatting={{ subscript: [[1, 2]] }}
			/>,
		);

		expect(screen.getByText("2", { selector: "sub" })).toBeInTheDocument();
		expect(screen.getByText("H", { exact: false })).not.toHaveClass(
			"font-bold",
		);
	});
});
