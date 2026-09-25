import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { QuizEditorData } from "@/lib/api-types";
import { SaveTrackerProvider } from "@/lib/save-tracker";
import { renderWithRouter } from "@/testing/render-with-router";

import { type EditorActions, QuizEditor } from "./quiz-editor";

const question = (id: string, text: string | null) => ({
	id,
	type: "quiz" as const,
	text,
});

function editorData(
	...questions: ReturnType<typeof question>[]
): QuizEditorData {
	return {
		quiz: {
			id: "quiz-1",
			title: "Geografia",
			description: null,
			coverImageUrl: null,
			visibility: "private",
			status: "draft",
			questionCount: questions.length,
			createdAt: "2026-06-01T12:00:00.000Z",
			updatedAt: "2026-06-01T12:00:00.000Z",
			trashedAt: null,
		},
		questions,
	};
}

async function renderEditor(
	data: QuizEditorData,
	{ afterAdd }: { afterAdd?: QuizEditorData } = {},
) {
	let setData: (data: QuizEditorData) => void = () => {};
	const actions: EditorActions = {
		saveTitle: vi.fn(async () => {}),
		saveQuestionText: vi.fn(async () => {}),
		// Like the real mutation: the cache (here, the harness state) gets the new list.
		addQuestion: vi.fn(async () => {
			if (afterAdd) {
				setData(afterAdd);
			}
			return { question: question("new", null), index: 1 };
		}),
		duplicateQuestion: vi.fn(async () => null),
		moveQuestion: vi.fn(),
		deleteQuestion: vi.fn(),
	};
	function Harness() {
		const [current, setCurrent] = useState(data);
		setData = setCurrent;
		return (
			<QuizEditor
				data={current}
				actions={actions}
				onOpenSettings={vi.fn()}
				onExit={vi.fn()}
			/>
		);
	}
	renderWithRouter(
		<SaveTrackerProvider>
			<Harness />
		</SaveTrackerProvider>,
	);
	await screen.findByRole("banner");
	return { actions, user: userEvent.setup() };
}

const questionText = () => screen.getByRole("textbox", { name: "Pergunta" });

describe("QuizEditor", () => {
	it("shows header, list, canvas and properties without the main nav", async () => {
		await renderEditor(editorData(question("a", "Capital?")));

		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("list", { name: "Perguntas" })).toBeInTheDocument();
		expect(questionText()).toHaveValue("Capital?");
		expect(
			screen.getByRole("heading", { name: "Propriedades da pergunta" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("navigation", { name: "Navegação principal" }),
		).toBeNull();
	});

	it("clicking a question selects it and shows its text", async () => {
		const { user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);

		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		expect(questionText()).toHaveValue("B?");
		expect(
			screen.getByRole("button", { name: "Pergunta 2: B?" }),
		).toHaveAttribute("aria-current", "true");
	});

	it("adding inserts after the selected question and selects it", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?")),
			{ afterAdd: editorData(question("a", "A?"), question("new", null)) },
		);

		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(actions.addQuestion).toHaveBeenCalledWith("a");
		expect(
			await screen.findByRole("button", { name: "Pergunta 2: sem texto" }),
		).toHaveAttribute("aria-current", "true");
	});

	it("deleting selects the question that took its place", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?"), question("c", "C?")),
		);
		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		await user.click(
			screen.getByRole("button", { name: "Excluir pergunta 2" }),
		);

		expect(actions.deleteQuestion).toHaveBeenCalledWith("b");
		expect(questionText()).toHaveValue("C?");
	});

	it("the list and properties open from buttons on narrow screens", async () => {
		const { user } = await renderEditor(editorData(question("a", "A?")));

		const listToggle = screen.getByRole("button", {
			name: "Lista de perguntas",
		});
		expect(listToggle).toHaveAttribute("aria-expanded", "false");
		await user.click(listToggle);

		expect(listToggle).toHaveAttribute("aria-expanded", "true");
		expect(
			within(document.body).getByRole("button", { name: "Propriedades" }),
		).toHaveAttribute("aria-expanded", "false");
	});
});
