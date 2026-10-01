import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData, QuizEditorData } from "@/lib/api-types";
import { SaveTrackerProvider } from "@/lib/save-tracker";
import { renderWithRouter } from "@/testing/render-with-router";

import { type EditorActions, QuizEditor } from "./quiz-editor";

const question = (id: string, text: string | null): QuestionData => ({
	...blankQuestion(id),
	text,
});

function editorData(...questions: QuestionData[]): QuizEditorData {
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
		saveQuestionField: vi.fn(async () => {}),
		changeQuestion: vi.fn(),
		changeQuestionType: vi.fn(),
		applyTimeLimitToAll: vi.fn(),
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
		await user.click(
			await screen.findByRole("menuitem", { name: "Verdadeiro ou falso" }),
		);

		expect(actions.addQuestion).toHaveBeenCalledExactlyOnceWith(
			"a",
			"trueFalse",
		);
		expect(
			await screen.findByRole("button", { name: "Pergunta 2: sem texto" }),
		).toHaveAttribute("aria-current", "true");
	});

	it("changing the type asks the action for the selected question", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);
		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		await user.click(
			screen.getByRole("combobox", { name: "Tipo de pergunta" }),
		);
		await user.click(
			await screen.findByRole("option", { name: "Verdadeiro ou falso" }),
		);

		expect(actions.changeQuestionType).toHaveBeenCalledExactlyOnceWith(
			"b",
			"trueFalse",
		);
	});

	it("shows a true/false question with its fixed answers and marks the correct one", async () => {
		const { actions, user } = await renderEditor(
			editorData({ ...blankQuestion("tf", "trueFalse"), text: "O céu é azul" }),
		);

		expect(screen.getByRole("list", { name: "Perguntas" })).toHaveTextContent(
			"1 Verdadeiro ou falso",
		);
		await user.click(
			screen.getByRole("checkbox", { name: "Verdadeiro correta" }),
		);

		expect(actions.changeQuestion).toHaveBeenCalledExactlyOnceWith("tf", {
			kind: "trueFalseCorrect",
			correct: true,
		});
	});
	it("a blank question gets no warnings until the creator leaves it and comes back", async () => {
		const { user } = await renderEditor(
			editorData(question("a", null), question("b", "B?")),
		);
		const hints = () => document.querySelectorAll("[data-slot=editor-hint]");

		// Just opened on a blank question: nothing is pointed out yet.
		expect(hints()).toHaveLength(0);
		expect(
			screen.queryByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeNull();
		// The other question was not started now, so it is flagged as usual.
		expect(
			screen.getByRole("button", { name: "Pergunta 2 incompleta" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));
		expect(
			screen.getByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Pergunta 1: sem texto" }),
		);
		expect(
			screen.getByText("Nenhuma pergunta foi adicionada."),
		).toBeInTheDocument();
		expect(
			screen.getByText("A resposta 1 não foi adicionada"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Marque pelo menos 1 resposta correta"),
		).toBeInTheDocument();
	});

	it("a question opened with something already written is warned about at once", async () => {
		await renderEditor(editorData(question("a", "Capital?")));

		expect(
			screen.getByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("A resposta 1 não foi adicionada"),
		).toBeInTheDocument();
	});

	it("a question just added starts without warnings, and the one left gets them", async () => {
		const { user } = await renderEditor(editorData(question("a", null)), {
			afterAdd: editorData(question("a", null), question("new", null)),
		});

		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(await screen.findByRole("menuitem", { name: "Quiz" }));

		expect(
			await screen.findByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Pergunta 2 incompleta" }),
		).toBeNull();
		expect(document.querySelectorAll("[data-slot=editor-hint]")).toHaveLength(
			0,
		);
	});

	it("deleting selects the question that took its place", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?"), question("c", "C?")),
		);
		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		await user.click(
			screen.getByRole("button", { name: "Excluir pergunta 2" }),
		);
		// Nothing is deleted before the creator confirms (spec 003, RN-14).
		const dialog = await screen.findByRole("alertdialog", {
			name: "Excluir pergunta",
		});
		expect(dialog).toHaveTextContent(
			"Tem certeza de que quer excluir a pergunta 2? Essa ação não pode ser desfeita.",
		);
		expect(actions.deleteQuestion).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		expect(actions.deleteQuestion).toHaveBeenCalledExactlyOnceWith("b");
		expect(questionText()).toHaveValue("C?");
		await vi.waitFor(() =>
			expect(screen.queryByRole("alertdialog")).toBeNull(),
		);
	});

	it("cancelling the confirmation keeps the question", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);

		await user.click(
			screen.getByRole("button", { name: "Excluir pergunta 2" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

		await vi.waitFor(() =>
			expect(screen.queryByRole("alertdialog")).toBeNull(),
		);
		expect(actions.deleteQuestion).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Pergunta 2: B?" }),
		).toBeInTheDocument();
	});

	it("Excluir in the properties panel asks about the selected question", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);
		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		await user.click(screen.getByRole("button", { name: "Excluir" }));
		const dialog = await screen.findByRole("alertdialog");
		expect(dialog).toHaveTextContent(
			"Tem certeza de que quer excluir a pergunta 2?",
		);
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		expect(actions.deleteQuestion).toHaveBeenCalledExactlyOnceWith("b");
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

	it("wires the canvas and the properties to the selected question", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);
		await user.click(screen.getByRole("button", { name: "Pergunta 2: B?" }));

		await user.type(
			screen.getByRole("textbox", { name: "Resposta 1" }),
			"Brasília",
		);
		await user.tab();
		await user.click(screen.getByRole("combobox", { name: "Limite de tempo" }));
		await user.click(
			await screen.findByRole("option", { name: "45 segundos" }),
		);
		await user.click(
			screen.getByRole("button", { name: "Aplicar a todas as perguntas" }),
		);
		await user.click(
			screen.getByRole("button", { name: "Adicionar mais respostas" }),
		);

		expect(actions.saveQuestionField).toHaveBeenCalledWith("b", {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "Brasília",
		});
		expect(actions.changeQuestion).toHaveBeenCalledWith("b", {
			kind: "timeLimit",
			seconds: 45,
		});
		expect(actions.changeQuestion).toHaveBeenCalledWith("b", {
			kind: "extraChoices",
			visible: true,
		});
		// The harness does not apply the change, so the question still has 20 s.
		expect(actions.applyTimeLimitToAll).toHaveBeenCalledWith(20);
	});
});
