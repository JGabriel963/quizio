import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { incompleteQuestions } from "@quizio/core/quiz/domain/question-issues";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";

import { IncompleteQuestionsDialog } from "./incomplete-questions-dialog";

const complete: QuestionData = {
	...blankQuestion("a"),
	text: "Capital do Brasil?",
	choices: blankQuestion("a").choices.map((choice, index) =>
		index < 2
			? {
					...choice,
					text: index === 0 ? "Brasília" : "Rio",
					correct: index === 0,
				}
			: choice,
	),
};
const noCorrect: QuestionData = {
	...complete,
	id: "b",
	choices: complete.choices.map((choice) => ({ ...choice, correct: false })),
};
const blank: QuestionData = blankQuestion("c");
const trueFalse: QuestionData = {
	...blankQuestion("d", "trueFalse"),
	text: "O céu é azul",
};

function renderDialog(questions: QuestionData[] | null) {
	const props = { onFix: vi.fn(), onBack: vi.fn(), onLeave: vi.fn() };
	render(
		<IncompleteQuestionsDialog
			items={questions && incompleteQuestions(questions)}
			{...props}
		/>,
	);
	return { props, user: userEvent.setup() };
}

const cards = () =>
	within(screen.getByRole("list", { name: "Perguntas incompletas" }));

describe("IncompleteQuestionsDialog", () => {
	it("lists each incomplete question with its reasons", () => {
		renderDialog([complete, noCorrect, blank, trueFalse]);

		expect(
			screen.getByRole("heading", { name: "Não é possível jogar este quiz" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Todas as perguntas precisam ser concluídas antes de começar a jogar.",
			),
		).toBeInTheDocument();
		expect(cards().queryByRole("listitem", { name: "Pergunta 1" })).toBeNull();

		const second = cards().getByRole("listitem", { name: "Pergunta 2" });
		expect(second).toHaveTextContent("2 - Quiz");
		expect(second).toHaveTextContent("Capital do Brasil?");
		expect(
			within(second)
				.getAllByRole("listitem")
				.map((reason) => reason.textContent),
		).toEqual(["!Resposta correta não selecionada"]);

		const third = cards().getByRole("listitem", { name: "Pergunta 3" });
		expect(third).toHaveTextContent("3 - Quiz");
		expect(
			within(third)
				.getAllByRole("listitem")
				.map((reason) => reason.textContent),
		).toEqual([
			"!Pergunta ausente",
			"!2 respostas faltando",
			"!Resposta correta não selecionada",
		]);

		const fourth = cards().getByRole("listitem", { name: "Pergunta 4" });
		expect(fourth).toHaveTextContent("4 - Verdadeiro ou falso");
		expect(
			within(fourth)
				.getAllByRole("listitem")
				.map((reason) => reason.textContent),
		).toEqual(["!Resposta correta não selecionada"]);
	});

	it("Corrigir asks for that question", async () => {
		const { props, user } = renderDialog([complete, noCorrect, blank]);

		await user.click(
			screen.getByRole("button", { name: "Corrigir pergunta 3" }),
		);

		expect(props.onFix).toHaveBeenCalledExactlyOnceWith("c");
	});

	it("Voltar para edição and Esc go back to the editor", async () => {
		const { props, user } = renderDialog([blank]);

		await user.click(
			screen.getByRole("button", { name: "Voltar para edição" }),
		);
		await user.keyboard("{Escape}");

		expect(props.onBack).toHaveBeenCalledTimes(2);
		expect(props.onLeave).not.toHaveBeenCalled();
	});

	it("Deixar sem salvar leaves the editor", async () => {
		const { props, user } = renderDialog([blank]);

		await user.click(screen.getByRole("button", { name: "Deixar sem salvar" }));

		expect(props.onLeave).toHaveBeenCalledOnce();
		expect(props.onFix).not.toHaveBeenCalled();
	});

	it("is closed without items", () => {
		renderDialog(null);

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
