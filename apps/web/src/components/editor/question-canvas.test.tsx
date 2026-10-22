import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";
import { SaveTrackerProvider } from "@/lib/save-tracker";

import { QuestionCanvas } from "./question-canvas";
import { NO_UPLOAD } from "./question-media";

function renderCanvas(question: QuestionData, showHints = true) {
	const handlers = {
		onSaveText: vi.fn(async () => {}),
		onSaveChoiceText: vi.fn(async () => {}),
		onSaveAcceptedAnswer: vi.fn(async () => {}),
		onSavePuzzleItem: vi.fn(async () => {}),
		onChange: vi.fn(),
		onUploadImage: vi.fn(),
	};
	render(
		<SaveTrackerProvider>
			<QuestionCanvas
				question={question}
				imageUrl={null}
				upload={NO_UPLOAD}
				showHints={showHints}
				{...handlers}
			/>
		</SaveTrackerProvider>,
	);
	return { handlers, user: userEvent.setup() };
}

function withChoices(
	texts: (string | null)[],
	correct: number[] = [],
): QuestionData {
	return {
		...blankQuestion("a"),
		text: "Capital?",
		choices: texts.map((text, index) => ({
			id: `choice-${index + 1}`,
			text,
			correct: correct.includes(index),
		})),
	};
}

const answerFields = () =>
	within(screen.getByRole("list", { name: "Respostas" })).getAllByRole(
		"textbox",
	);

describe("QuestionCanvas", () => {
	it("shows the text, the media area and four answer fields with Kahoot placeholders", () => {
		renderCanvas({ ...blankQuestion("a"), text: "Capital?" });

		expect(screen.getByRole("textbox", { name: "Pergunta" })).toHaveValue(
			"Capital?",
		);
		const media = screen.getByRole("region", { name: "Mídia" });
		expect(media).toHaveTextContent("Encontre e insira mídia");
		expect(
			answerFields().map((field) => field.getAttribute("placeholder")),
		).toEqual([
			"Adicionar resposta 1",
			"Adicionar resposta 2",
			"Adicionar resposta 3 (opcional)",
			"Adicionar resposta 4 (opcional)",
		]);
		expect(screen.queryByText("Em breve")).toBeNull();
	});

	it("a true/false question shows its two fixed answers and no extra answers action", async () => {
		const { handlers, user } = renderCanvas({
			...blankQuestion("a", "trueFalse"),
			text: "O céu é azul",
		});

		expect(screen.getByRole("textbox", { name: "Pergunta" })).toHaveValue(
			"O céu é azul",
		);
		expect(
			within(screen.getByRole("list", { name: "Respostas" }))
				.getAllByRole("listitem")
				.map((answer) => answer.textContent),
		).toEqual(["Verdadeiro", "Falso"]);
		expect(
			screen.queryByRole("button", { name: "Adicionar mais respostas" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Marque a resposta correta")).toBeInTheDocument();

		await user.click(screen.getByRole("checkbox", { name: "Falso correta" }));

		expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "trueFalseCorrect",
			correct: false,
		});
	});

	it("Adicionar mais respostas shows the extra answers", async () => {
		const { handlers, user } = renderCanvas(blankQuestion("a"));

		await user.click(
			screen.getByRole("button", { name: "Adicionar mais respostas" }),
		);

		expect(handlers.onChange).toHaveBeenCalledWith({
			kind: "extraChoices",
			visible: true,
		});
	});

	it("with six answers offers Remover respostas extras", async () => {
		const { handlers, user } = renderCanvas(
			withChoices(["A", "B", null, null, "Salvador", null]),
		);

		expect(answerFields()).toHaveLength(6);
		await user.click(
			screen.getByRole("button", { name: "Remover respostas extras" }),
		);

		expect(handlers.onChange).toHaveBeenCalledWith({
			kind: "extraChoices",
			visible: false,
		});
	});

	it("hints the missing answers 1 and 2 and the missing correct one", () => {
		renderCanvas(withChoices([null, null, "Rio", null]));

		expect(
			screen.getByText("A resposta 1 não foi adicionada"),
		).toBeInTheDocument();
		expect(
			screen.getByText("A resposta 2 não foi adicionada"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Marque pelo menos 1 resposta correta"),
		).toBeInTheDocument();
	});

	it("hints the missing question text until it is written", async () => {
		const { user } = renderCanvas(blankQuestion("a"));

		expect(
			screen.getByText("Nenhuma pergunta foi adicionada."),
		).toBeInTheDocument();
		await user.type(screen.getByRole("textbox", { name: "Pergunta" }), "C");

		expect(screen.queryByText("Nenhuma pergunta foi adicionada.")).toBeNull();
	});

	it("shows no hints at all while the question is just started", () => {
		renderCanvas(blankQuestion("a"), false);
		expect(document.querySelector("[data-slot=editor-hint]")).toBeNull();
	});

	it("shows no hint on a just started true/false question", () => {
		renderCanvas(blankQuestion("a", "trueFalse"), false);
		expect(document.querySelector("[data-slot=editor-hint]")).toBeNull();
	});

	it("no hints for a complete question", () => {
		renderCanvas(withChoices(["Brasília", null, "Rio", null], [0]));

		expect(screen.queryByText(/não foi adicionada/)).toBeNull();
		expect(
			screen.queryByText("Marque pelo menos 1 resposta correta"),
		).toBeNull();
	});

	it("marking an answer correct sends the change", async () => {
		const { handlers, user } = renderCanvas(
			withChoices(["Brasília", "Rio", null, null]),
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Resposta 2 correta" }),
		);

		await vi.waitFor(() =>
			expect(handlers.onChange).toHaveBeenCalledWith({
				kind: "choiceCorrect",
				choiceId: "choice-2",
				correct: true,
			}),
		);
	});

	it("a type answer shows its accepted answers (spec 031)", () => {
		renderCanvas({
			...blankQuestion("a", "typeAnswer"),
			text: "Quem andou sobre as águas?",
			acceptedAnswers: ["Pedro", "Jesus"],
		});

		expect(
			screen.getByRole("textbox", { name: "Resposta aceita" }),
		).toHaveValue("Pedro");
		expect(
			screen.getByRole("textbox", { name: "Outra resposta aceita 1" }),
		).toHaveValue("Jesus");
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
	});
});

describe("QuestionCanvas with a puzzle (spec 033)", () => {
	const puzzle = (): QuestionData => ({
		...blankQuestion("a", "puzzle"),
		text: "Coloque estes rios do maior para o menor",
		items: ["Nilo", "Amazonas", null, null],
	});

	it("shows the puzzle's four answers in place of the grid", () => {
		renderCanvas(puzzle());

		expect(screen.getByRole("textbox", { name: "Resposta 1" })).toHaveValue(
			"Nilo",
		);
		expect(screen.getByRole("textbox", { name: "Resposta 4" })).toHaveValue("");
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
	});

	it("saves a slot's text through its own handler", async () => {
		const { handlers, user } = renderCanvas(puzzle());

		await user.type(
			screen.getByRole("textbox", { name: "Resposta 3" }),
			"Yangtzé",
		);
		await user.tab();

		expect(handlers.onSavePuzzleItem).toHaveBeenLastCalledWith(2, "Yangtzé");
	});

	it("the question text tells to add the expected order while it is edited (RN-06)", async () => {
		const { user } = renderCanvas(puzzle());
		const tip =
			'Adicione a ordem esperada para ajudar os participantes a responder corretamente (por exemplo, "do menor ao maior").';
		expect(screen.queryByText(tip)).toBeNull();

		await user.click(screen.getByRole("textbox", { name: "Pergunta" }));

		expect(screen.getByText(tip)).toBeInTheDocument();
	});

	it("other types have no such tip", async () => {
		const { user } = renderCanvas(withChoices(["A", "B", null, null], [0]));

		await user.click(screen.getByRole("textbox", { name: "Pergunta" }));

		expect(screen.queryByText(/ordem esperada/)).toBeNull();
	});
});
