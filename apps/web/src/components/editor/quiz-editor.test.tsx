import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { newQuestionImage } from "@quizio/core/quiz/domain/question-image";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData, QuizEditorData } from "@/lib/api-types";
import { withQuizPublished } from "@/lib/editor-cache";
import {
	createSaveTracker,
	type SaveTracker,
	SaveTrackerProvider,
} from "@/lib/save-tracker";
import { renderWithRouter } from "@/testing/render-with-router";

import { type EditorActions, QuizEditor } from "./quiz-editor";

const IMAGE_KEY = "media/user-1/ponte.png";
const IMAGE_URL = "https://media.test/media/user-1/ponte.png";

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
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
			questionCount: questions.length,
			createdAt: "2026-06-01T12:00:00.000Z",
			updatedAt: "2026-06-01T12:00:00.000Z",
			trashedAt: null,
		},
		questions,
		publishedQuestions: null,
		imageUrls: {},
	};
}

/** A question with everything Salvar asks for. */
const complete = (id: string, text: string): QuestionData => ({
	...blankQuestion(id),
	text,
	choices: blankQuestion(id).choices.map((choice, index) =>
		index < 2
			? {
					...choice,
					text: index === 0 ? "Brasília" : "Rio",
					correct: index === 0,
				}
			: choice,
	),
});

/** The editor of a quiz already saved as playable with `published`. */
function publishedData(
	published: QuestionData[],
	current: QuestionData[] = published,
): QuizEditorData {
	const data = editorData(...current);
	return {
		...data,
		quiz: {
			...data.quiz,
			status: "published",
			publishedVersion: 1,
			publishedAt: "2026-06-01T12:00:00.000Z",
		},
		publishedQuestions: published,
	};
}

async function renderEditor(
	data: QuizEditorData,
	{
		afterAdd,
		tracker,
	}: { afterAdd?: QuizEditorData; tracker?: SaveTracker } = {},
) {
	let latest = data;
	let setData: (data: QuizEditorData) => void = () => {};
	const onExit = vi.fn();
	const onError = vi.fn();
	// Uploads stay pending until the test ends them, with a failure or an image.
	const pendingUploads: (() => void)[] = [];
	const endUpload = (failure: string | null = null) => {
		act(() => pendingUploads.shift()?.());
		return failure;
	};
	let uploadFailure: string | null = null;
	const actions: EditorActions = {
		current: () => latest,
		// Like the real mutation: the cache holds the published quiz afterwards.
		publish: vi.fn(async (touches) => {
			setData(
				withQuizPublished(latest, {
					...latest.quiz,
					status: "published",
					publishedVersion: (latest.quiz.publishedVersion ?? 0) + 1,
					...(touches && {
						title: touches.title,
						description: touches.description,
					}),
				}),
			);
			return null;
		}),
		discardChanges: vi.fn(async () => null),
		saveTitle: vi.fn(async () => {}),
		saveQuestionField: vi.fn(async () => {}),
		changeQuestion: vi.fn(),
		// Like the real action: on success the cache gets the image and its URL.
		uploadQuestionImage: vi.fn(
			(questionId, _file, onProgress) =>
				new Promise<string | null>((resolve) => {
					onProgress(0.5);
					pendingUploads.push(() => {
						if (uploadFailure === null) {
							setData({
								...latest,
								imageUrls: { ...latest.imageUrls, [IMAGE_KEY]: IMAGE_URL },
								questions: latest.questions.map((item) =>
									item.id === questionId
										? { ...item, image: newQuestionImage(IMAGE_KEY) }
										: item,
								),
							});
						}
						resolve(uploadFailure);
					});
				}),
		),
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
		latest = current;
		setData = (next) => {
			latest = next;
			act(() => setCurrent(next));
		};
		return (
			<QuizEditor
				data={current}
				actions={actions}
				onOpenSettings={vi.fn()}
				onExit={onExit}
				onError={onError}
			/>
		);
	}
	renderWithRouter(
		<SaveTrackerProvider tracker={tracker}>
			<Harness />
		</SaveTrackerProvider>,
	);
	await screen.findByRole("banner");
	return {
		actions,
		onExit,
		onError,
		user: userEvent.setup(),
		/** Ends the oldest pending upload, as a failure when a message is given. */
		endUpload: async (failure: string | null = null) => {
			uploadFailure = failure;
			endUpload(failure);
			await act(async () => {});
		},
	};
}

const saveButton = () => screen.getByRole("button", { name: "Salvar" });
const exitButton = () => screen.getByRole("button", { name: "Sair" });
// Looked up in the DOM: an open dialog hides the header from the roles.
const header = () => document.querySelector("header") as HTMLElement;
const badge = (label: string) => within(header()).queryByText(label);

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

describe("QuizEditor: Salvar", () => {
	it("publishes a complete quiz and shows it is ready", async () => {
		const { actions, onExit, user } = await renderEditor(
			editorData(complete("a", "Capital do Brasil?")),
		);
		expect(badge("Rascunho")).toBeInTheDocument();

		await user.click(saveButton());

		const dialog = await screen.findByRole("dialog", {
			name: "O quiz está pronto",
		});
		expect(actions.publish).toHaveBeenCalledExactlyOnceWith(undefined);
		expect(badge("Publicado")).toBeInTheDocument();

		await user.click(within(dialog).getByRole("button", { name: "Pronto" }));
		expect(onExit).toHaveBeenCalledExactlyOnceWith("library");
	});

	it("Voltar para edição stays in the editor, published", async () => {
		const { onExit, user } = await renderEditor(
			editorData(complete("a", "Capital do Brasil?")),
		);

		await user.click(saveButton());
		await user.click(
			await screen.findByRole("button", { name: "Voltar para edição" }),
		);

		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(onExit).not.toHaveBeenCalled();
		expect(badge("Publicado")).toBeInTheDocument();
	});

	it("lists the incomplete questions instead of publishing", async () => {
		const { actions, user } = await renderEditor(
			editorData(complete("a", "A?"), question("b", "B?"), complete("c", "C?")),
		);

		await user.click(saveButton());

		const dialog = await screen.findByRole("dialog", {
			name: "Não é possível jogar este quiz",
		});
		expect(
			within(dialog)
				.getAllByRole("button", { name: /^Corrigir pergunta/ })
				.map((button) => button.getAttribute("aria-label")),
		).toEqual(["Corrigir pergunta 2"]);
		expect(actions.publish).not.toHaveBeenCalled();
		expect(badge("Rascunho")).toBeInTheDocument();
	});

	it("Corrigir selects the question and shows its hints", async () => {
		const { user } = await renderEditor(
			editorData(complete("a", "A?"), question("b", null), question("c", null)),
		);

		await user.click(saveButton());
		await user.click(
			await screen.findByRole("button", { name: "Corrigir pergunta 3" }),
		);

		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(
			screen.getByRole("button", { name: "Pergunta 3: sem texto" }),
		).toHaveAttribute("aria-current", "true");
		expect(
			screen.getByText("Nenhuma pergunta foi adicionada."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Pergunta 2 incompleta" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Pergunta 3 incompleta" }),
		).toBeInTheDocument();
	});

	it("a just-started question blocks saving and gets its alert", async () => {
		const { actions, user } = await renderEditor(
			editorData(question("a", null)),
		);
		expect(
			screen.queryByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeNull();

		await user.click(saveButton());

		expect(
			await screen.findByRole("button", { name: "Corrigir pergunta 1" }),
		).toBeInTheDocument();
		expect(actions.publish).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("button", { name: "Voltar para edição" }),
		);
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(
			screen.getByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeInTheDocument();
	});

	it("Voltar para edição keeps the selection", async () => {
		const { onExit, user } = await renderEditor(
			editorData(complete("a", "A?"), question("b", null)),
		);

		await user.click(saveButton());
		await user.click(
			await screen.findByRole("button", { name: "Voltar para edição" }),
		);

		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(
			screen.getByRole("button", { name: "Pergunta 1: A?" }),
		).toHaveAttribute("aria-current", "true");
		expect(onExit).not.toHaveBeenCalled();
	});

	it("Deixar sem salvar leaves to the library without publishing", async () => {
		const { actions, onExit, user } = await renderEditor(
			publishedData(
				[complete("a", "A?")],
				[complete("a", "A?"), question("b", null)],
			),
		);

		await user.click(saveButton());
		await user.click(
			await screen.findByRole("button", { name: "Deixar sem salvar" }),
		);

		// No exit dialog on top: the changes simply stay (RN-11a).
		expect(onExit).toHaveBeenCalledExactlyOnceWith("library");
		expect(actions.publish).not.toHaveBeenCalled();
		expect(actions.discardChanges).not.toHaveBeenCalled();
	});

	it("asks for the title, then publishes", async () => {
		const data = editorData(complete("a", "Capital do Brasil?"));
		const { actions, user } = await renderEditor({
			...data,
			quiz: { ...data.quiz, title: null },
		});

		await user.click(saveButton());
		const dialog = await screen.findByRole("dialog", { name: "Toques finais" });
		expect(actions.publish).not.toHaveBeenCalled();
		await user.type(
			within(dialog).getByRole("textbox", { name: "Título" }),
			"Capitais do mundo",
		);
		await user.click(within(dialog).getByRole("button", { name: "Continuar" }));

		expect(actions.publish).toHaveBeenCalledExactlyOnceWith({
			title: "Capitais do mundo",
			description: null,
		});
		expect(
			await screen.findByRole("dialog", { name: "O quiz está pronto" }),
		).toBeInTheDocument();
		// The header shows the title that was just saved.
		expect(
			screen.getByRole("textbox", { name: "Título do quiz", hidden: true }),
		).toHaveValue("Capitais do mundo");
	});

	it("incomplete questions come before the title", async () => {
		const data = editorData(question("a", "A?"));
		const { user } = await renderEditor({
			...data,
			quiz: { ...data.quiz, title: null },
		});

		await user.click(saveButton());

		expect(
			await screen.findByRole("dialog", {
				name: "Não é possível jogar este quiz",
			}),
		).toBeInTheDocument();
		expect(screen.queryByRole("dialog", { name: "Toques finais" })).toBeNull();
	});

	it("Salvar waits for the autosave", async () => {
		const tracker = createSaveTracker();
		const { actions, user } = await renderEditor(
			editorData(complete("a", "A?")),
			{ tracker },
		);
		let finish!: () => void;
		void tracker.track(
			"question:a:text",
			() => new Promise<void>((resolve) => (finish = resolve)),
		);

		await user.click(saveButton());
		expect(actions.publish).not.toHaveBeenCalled();
		finish();

		await vi.waitFor(() => expect(actions.publish).toHaveBeenCalledOnce());
	});

	it("a failed autosave stops Salvar", async () => {
		const tracker = createSaveTracker();
		const { actions, user } = await renderEditor(
			editorData(complete("a", "A?")),
			{ tracker },
		);
		await act(() =>
			tracker.track("question:a:text", async () => {
				throw new Error("offline");
			}),
		);

		await user.click(saveButton());

		expect(actions.publish).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(within(header()).getByRole("status")).toHaveTextContent(
			"Não foi possível salvar",
		);
	});

	it("tells why the server refused and stays in the editor", async () => {
		const { actions, onError, user } = await renderEditor(
			editorData(complete("a", "A?")),
		);
		vi.mocked(actions.publish).mockResolvedValueOnce(
			"Complete todas as perguntas antes de salvar o quiz.",
		);

		await user.click(saveButton());

		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledExactlyOnceWith(
				"Complete todas as perguntas antes de salvar o quiz.",
			),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(saveButton()).toBeEnabled();
	});
});

describe("QuizEditor: published quiz", () => {
	const a = complete("a", "Capital do Brasil?");

	it("shows whether the questions differ from the playable version", async () => {
		await renderEditor(publishedData([a]));
		expect(badge("Publicado")).toBeInTheDocument();
	});

	it("a changed list shows unpublished changes", async () => {
		await renderEditor(publishedData([a], [{ ...a, timeLimitSeconds: 30 }]));

		expect(badge("Alterações não salvas")).toBeInTheDocument();
	});

	it("restores the title of a published quiz", async () => {
		const { actions, onError, user } = await renderEditor(publishedData([a]));
		const title = () => screen.getByRole("textbox", { name: "Título do quiz" });

		await user.clear(title());
		await user.tab();

		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledExactlyOnceWith(
				"Um quiz publicado precisa de título",
			),
		);
		expect(actions.saveTitle).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(title()).toHaveValue("Geografia"));
	});

	it("a draft may lose its title", async () => {
		const { actions, onError, user } = await renderEditor(editorData(a));

		await user.clear(screen.getByRole("textbox", { name: "Título do quiz" }));
		await user.tab();

		await vi.waitFor(() =>
			expect(actions.saveTitle).toHaveBeenCalledExactlyOnceWith(null),
		);
		expect(onError).not.toHaveBeenCalled();
	});

	it("Sair leaves at once without pending changes", async () => {
		const draft = await renderEditor(editorData(question("a", null)));
		await draft.user.click(exitButton());
		await vi.waitFor(() =>
			expect(draft.onExit).toHaveBeenCalledExactlyOnceWith("library"),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("Sair of a published quiz without changes does not ask", async () => {
		const { onExit, user } = await renderEditor(publishedData([a]));

		await user.click(exitButton());

		await vi.waitFor(() =>
			expect(onExit).toHaveBeenCalledExactlyOnceWith("library"),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("Sair and the brand ask when there are unpublished changes", async () => {
		const { onExit, user } = await renderEditor(
			publishedData([a], [{ ...a, text: "Capital da Argentina?" }]),
		);

		await user.click(exitButton());
		const dialog = await screen.findByRole("dialog", {
			name: "Algumas alterações não foram salvas",
		});
		expect(onExit).not.toHaveBeenCalled();

		await user.click(
			within(dialog).getByRole("button", { name: "Voltar para edição" }),
		);
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(onExit).not.toHaveBeenCalled();

		await user.click(screen.getByRole("link", { name: "Quizio" }));
		expect(
			await screen.findByRole("dialog", {
				name: "Algumas alterações não foram salvas",
			}),
		).toBeInTheDocument();
	});

	it("Deixar sem salvar leaves to the asked destination", async () => {
		const { actions, onExit, user } = await renderEditor(
			publishedData([a], [{ ...a, text: "Mudou" }]),
		);

		await user.click(screen.getByRole("link", { name: "Quizio" }));
		await user.click(
			await screen.findByRole("button", { name: "Deixar sem salvar" }),
		);

		expect(onExit).toHaveBeenCalledExactlyOnceWith("home");
		expect(actions.discardChanges).not.toHaveBeenCalled();
	});

	it("Descartar discards and then leaves", async () => {
		const { actions, onExit, user } = await renderEditor(
			publishedData([a], [{ ...a, text: "Mudou" }]),
		);

		await user.click(exitButton());
		await user.click(await screen.findByRole("button", { name: "Descartar" }));

		await vi.waitFor(() =>
			expect(onExit).toHaveBeenCalledExactlyOnceWith("library"),
		);
		expect(actions.discardChanges).toHaveBeenCalledOnce();
	});

	it("a failed discard keeps the editor open", async () => {
		const { actions, onExit, onError, user } = await renderEditor(
			publishedData([a], [{ ...a, text: "Mudou" }]),
		);
		vi.mocked(actions.discardChanges).mockResolvedValueOnce(
			"Não foi possível concluir. Tente novamente.",
		);

		await user.click(exitButton());
		await user.click(await screen.findByRole("button", { name: "Descartar" }));

		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledExactlyOnceWith(
				"Não foi possível concluir. Tente novamente.",
			),
		);
		expect(onExit).not.toHaveBeenCalled();
		expect(
			screen.getByRole("textbox", { name: "Pergunta", hidden: true }),
		).toHaveValue("Mudou");
		expect(badge("Alterações não salvas")).toBeInTheDocument();
	});

	it("Salvar of a published quiz with changes publishes again", async () => {
		const { actions, user } = await renderEditor(
			publishedData([a], [{ ...a, timeLimitSeconds: 30 }]),
		);

		await user.click(saveButton());

		expect(
			await screen.findByRole("dialog", { name: "O quiz está pronto" }),
		).toBeInTheDocument();
		expect(actions.publish).toHaveBeenCalledOnce();
		expect(badge("Publicado")).toBeInTheDocument();
	});
});

describe("QuizEditor question image (spec 007)", () => {
	const mediaArea = () => screen.getByRole("region", { name: "Mídia" });
	const dropImage = () =>
		fireEvent.drop(mediaArea(), {
			dataTransfer: {
				files: [new File(["x"], "ponte.png", { type: "image/png" })],
			},
		});
	const selectQuestion = (
		user: ReturnType<typeof userEvent.setup>,
		n: number,
	) =>
		user.click(
			screen.getByRole("button", { name: new RegExp(`^Pergunta ${n}:`) }),
		);

	it("the upload lands on the question it started in", async () => {
		const { actions, user, endUpload } = await renderEditor(
			editorData(question("a", "A?"), question("b", "B?")),
		);

		dropImage();
		expect(
			within(mediaArea()).getByRole("progressbar", { name: "Enviando imagem" }),
		).toHaveValue(0.5);
		await selectQuestion(user, 2);
		// Question B shows its own empty area while A's upload goes on.
		expect(within(mediaArea()).queryByRole("progressbar")).toBeNull();
		await endUpload();

		expect(actions.uploadQuestionImage).toHaveBeenCalledExactlyOnceWith(
			"a",
			expect.any(File),
			expect.any(Function),
		);
		expect(within(mediaArea()).queryByRole("img")).toBeNull();
		await selectQuestion(user, 1);
		expect(
			within(mediaArea()).getByRole("img", { name: "Imagem da pergunta" }),
		).toHaveAttribute("src", IMAGE_URL);
	});

	it("a failed upload is told next to the media area", async () => {
		const { endUpload } = await renderEditor(editorData(question("a", "A?")));

		dropImage();
		await endUpload("Não foi possível enviar a imagem. Tente de novo.");

		expect(within(mediaArea()).getByRole("alert")).toHaveTextContent(
			"Não foi possível enviar a imagem. Tente de novo.",
		);
		expect(within(mediaArea()).queryByRole("progressbar")).toBeNull();
	});

	it("shows the image of each question in the list", async () => {
		const withImage = {
			...question("a", "A?"),
			image: newQuestionImage(IMAGE_KEY),
		};
		await renderEditor({
			...editorData(withImage, question("b", "B?")),
			imageUrls: { [IMAGE_KEY]: IMAGE_URL },
		});

		const thumbnails = document.querySelectorAll(
			"[data-slot=question-thumbnail] img",
		);
		expect(thumbnails).toHaveLength(1);
		expect(thumbnails[0]).toHaveAttribute("src", IMAGE_URL);
	});

	it("an image used as background covers the question area", async () => {
		const asBackground = {
			...question("a", "A?"),
			image: {
				...newQuestionImage(IMAGE_KEY),
				placement: "background" as const,
				altText: "Ponte",
			},
		};
		await renderEditor({
			...editorData(asBackground, question("b", "B?")),
			imageUrls: { [IMAGE_KEY]: IMAGE_URL },
		});

		const background = document.querySelector(
			"[data-slot=question-background]",
		);
		expect(background).toHaveAttribute("src", IMAGE_URL);
		expect(background).toHaveAttribute("alt", "Ponte");
		expect(within(mediaArea()).queryByRole("img")).toBeNull();
		expect(
			within(mediaArea()).getByRole("button", { name: "Usar como mídia" }),
		).toBeInTheDocument();
	});

	it("image actions go to the selected question", async () => {
		const withImage = {
			...question("a", "A?"),
			image: newQuestionImage(IMAGE_KEY),
		};
		const { actions, user } = await renderEditor({
			...editorData(withImage),
			imageUrls: { [IMAGE_KEY]: IMAGE_URL },
		});

		await user.click(screen.getByRole("button", { name: "Remover imagem" }));

		expect(actions.changeQuestion).toHaveBeenCalledExactlyOnceWith("a", {
			kind: "image",
			key: null,
		});
	});

	it("an image change of a published quiz is an unsaved change", async () => {
		const published = complete("a", "A?");
		await renderEditor({
			...publishedData(
				[published],
				[{ ...published, image: newQuestionImage(IMAGE_KEY) }],
			),
			imageUrls: { [IMAGE_KEY]: IMAGE_URL },
		});

		expect(badge("Alterações não salvas")).toBeInTheDocument();
	});
});
