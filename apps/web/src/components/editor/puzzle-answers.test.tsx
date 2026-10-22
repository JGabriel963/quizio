import {
	blankQuestion,
	type PuzzleQuestion,
} from "@quizio/core/quiz/domain/question";
import {
	applyQuestionChange,
	type QuestionChange,
} from "@quizio/core/quiz/domain/question-change";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SaveTrackerProvider } from "@/lib/save-tracker";

import { PuzzleAnswers } from "./puzzle-answers";

function renderAnswers(items: (string | null)[] = [null, null, null, null]) {
	const onSaveItem = vi.fn(async () => {});
	const onChange = vi.fn();
	const question = { ...blankQuestion("q1", "puzzle"), items };
	const view = render(
		<SaveTrackerProvider>
			<PuzzleAnswers
				question={question}
				onSaveItem={onSaveItem}
				onChange={onChange}
			/>
		</SaveTrackerProvider>,
	);
	return { onSaveItem, onChange, user: userEvent.setup(), ...view };
}

const field = (position: number) =>
	screen.getByRole("textbox", { name: `Resposta ${position}` });

describe("PuzzleAnswers (spec 033)", () => {
	it("shows the four placeholders, the shapes and the hint", () => {
		renderAnswers();

		expect(field(1)).toHaveAttribute("placeholder", "Adicionar resposta 1");
		expect(field(3)).toHaveAttribute("placeholder", "Adicionar resposta 3");
		expect(field(4)).toHaveAttribute(
			"placeholder",
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
		const { user } = renderAnswers();

		await user.type(field(2), "A");

		const row = field(2).closest("[data-slot=puzzle-answer]");
		expect(row).toHaveClass("bg-answer-blue");
		expect(screen.getByText("74")).toBeInTheDocument();
		expect(field(1).closest("[data-slot=puzzle-answer]")).toHaveClass(
			"bg-card",
		);
	});

	it("does not take a 76th character", async () => {
		const { user } = renderAnswers();

		await user.click(field(1));
		await user.paste("a".repeat(80));

		expect(field(1)).toHaveValue("a".repeat(75));
	});

	it("saves a slot's text", async () => {
		const { onSaveItem, user } = renderAnswers();

		await user.type(field(1), "Nilo");
		await user.tab();

		expect(onSaveItem).toHaveBeenLastCalledWith(0, "Nilo");
	});

	it("the keyboard moves a slot one place up and sends puzzleItemMoved", async () => {
		const { onChange, user } = renderAnswers([
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
		const { onChange, user } = renderAnswers([
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
		const user = userEvent.setup();

		screen.getByRole("button", { name: "Mover Amazonas" }).focus();
		await user.keyboard("{ArrowUp}");

		expect(field(1)).toHaveValue("Amazonas");
		expect(field(2)).toHaveValue("Nilo");
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Mover Amazonas" }),
			).toHaveFocus(),
		);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(field(1)).toHaveValue("Amazonas");
		expect(field(3)).toHaveValue("Yangtzé");
	});
});
