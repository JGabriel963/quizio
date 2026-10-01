import {
	blankQuestion,
	type QuizQuestion,
} from "@quizio/core/quiz/domain/question";
import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";

import { QuestionList } from "./question-list";

/** A complete question unless overridden, so only the tests about issues see the alert. */
const question = (
	id: string,
	text: string | null,
	overrides: Partial<QuizQuestion> = {},
): QuizQuestion => ({
	...blankQuestion(id),
	text,
	choices: [
		{ id: "choice-1", text: "Brasília", correct: true },
		{ id: "choice-2", text: "Rio", correct: false },
		{ id: "choice-3", text: null, correct: false },
		{ id: "choice-4", text: null, correct: false },
	],
	...overrides,
});

function renderList(
	questions: QuestionData[],
	selectedId = questions[0]?.id,
	quietIds: string[] = [],
) {
	const handlers = {
		onSelect: vi.fn(),
		onAdd: vi.fn(),
		onDuplicate: vi.fn(),
		onDelete: vi.fn(),
		onMove: vi.fn(),
	};
	render(
		<QuestionList
			questions={questions}
			selectedId={selectedId ?? ""}
			quietIds={new Set(quietIds)}
			{...handlers}
		/>,
	);
	return { handlers, user: userEvent.setup() };
}

const items = () =>
	within(screen.getByRole("list", { name: "Perguntas" })).getAllByRole(
		"listitem",
	);

describe("QuestionList", () => {
	it("shows each question's time limit in seconds", () => {
		renderList([question("a", "A?", { timeLimitSeconds: 90 })]);

		expect(
			within(items()[0] as HTMLElement).getByText("90"),
		).toBeInTheDocument();
	});

	it("flags an incomplete question with its reasons", () => {
		renderList([
			question("a", null, { choices: blankQuestion("a").choices }),
			question("b", "B?"),
		]);

		const warning = screen.getByRole("button", {
			name: "Pergunta 1 incompleta",
		});
		expect(warning).toHaveAccessibleDescription(
			"Pergunta ausente. 2 respostas faltando. Resposta correta não selecionada.",
		);
		expect(
			screen.queryByRole("button", { name: "Pergunta 2 incompleta" }),
		).toBeNull();
	});

	it("tells how many answers are missing", () => {
		renderList([
			question("a", "A?", {
				choices: blankQuestion("a").choices.map((choice, index) =>
					index === 0 ? { ...choice, text: "Brasília", correct: true } : choice,
				),
			}),
		]);

		expect(
			screen.getByRole("button", { name: "Pergunta 1 incompleta" }),
		).toHaveAccessibleDescription("1 resposta faltando.");
	});

	it("does not flag a question the creator has just started", () => {
		renderList(
			[blankQuestion("a"), blankQuestion("b"), question("c", "C?")],
			"b",
			["b"],
		);

		expect(
			screen.getByRole("button", { name: "Pergunta 1 incompleta" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Pergunta 2 incompleta" }),
		).toBeNull();
	});

	it("shows position, type and the start of the text for each question", () => {
		renderList([
			question("a", "Qual é a capital do Brasil?"),
			question("b", null),
		]);

		const [first, second] = items();
		expect(first).toHaveTextContent("1 Quiz");
		expect(first).toHaveTextContent("Qual é a capital do Brasil?");
		expect(second).toHaveTextContent("2 Quiz");
	});

	it("shows the type name, the two answers and the alert of a true/false question", () => {
		renderList([
			question("a", "A?"),
			{ ...blankQuestion("b", "trueFalse"), timeLimitSeconds: 10 },
			{
				...blankQuestion("c", "trueFalse"),
				text: "O céu é azul",
				correct: false,
			},
		]);

		const [, second, third] = items();
		expect(second).toHaveTextContent("2 Verdadeiro ou falso");
		expect(within(second as HTMLElement).getByText("10")).toBeInTheDocument();
		expect(
			(second as HTMLElement).querySelectorAll("[data-slot=answer-bar]"),
		).toHaveLength(2);
		expect(
			screen.getByRole("button", { name: "Pergunta 2 incompleta" }),
		).toHaveAccessibleDescription(
			"Pergunta ausente. Resposta correta não selecionada.",
		);
		expect(third).toHaveTextContent("3 Verdadeiro ou falso");
		expect(
			screen.queryByRole("button", { name: "Pergunta 3 incompleta" }),
		).toBeNull();
	});

	it("marks the correct answers with a dot on the card's answer bars", () => {
		renderList([
			question("a", "A?"),
			{ ...blankQuestion("b", "trueFalse"), correct: false },
			blankQuestion("c"),
		]);

		const dots = (item: HTMLElement | undefined) =>
			[...(item?.querySelectorAll("[data-slot=answer-bar]") ?? [])].map(
				(bar) => bar.querySelector("[data-slot=answer-bar-correct]") !== null,
			);
		const [first, second, third] = items();
		expect(dots(first)).toEqual([true, false, false, false]);
		expect(dots(second)).toEqual([false, true]);
		expect(dots(third)).toEqual([false, false, false, false]);
	});

	it("highlights the selected question and selects on click", async () => {
		const { handlers, user } = renderList(
			[question("a", "A"), question("b", "B")],
			"b",
		);

		const select = (n: number) =>
			screen.getByRole("button", { name: new RegExp(`^Pergunta ${n}:`) });
		expect(select(2)).toHaveAttribute("aria-current", "true");
		expect(select(1)).not.toHaveAttribute("aria-current");
		await user.click(select(1));

		expect(handlers.onSelect).toHaveBeenCalledWith("a");
	});

	it("duplicates, deletes and adds through the handlers", async () => {
		const { handlers, user } = renderList([
			question("a", "A"),
			question("b", "B"),
		]);

		await user.click(
			screen.getByRole("button", { name: "Duplicar pergunta 2" }),
		);
		await user.click(
			screen.getByRole("button", { name: "Excluir pergunta 1" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		await user.click(
			await screen.findByRole("menuitem", { name: "Verdadeiro ou falso" }),
		);

		expect(handlers.onDuplicate).toHaveBeenCalledWith("b");
		expect(handlers.onDelete).toHaveBeenCalledWith("a");
		expect(handlers.onAdd).toHaveBeenCalledExactlyOnceWith("trueFalse");
	});

	it("delete is disabled with 'Não é possível excluir todo o conteúdo' when only one question remains", async () => {
		const { handlers, user } = renderList([question("a", "A")]);

		const remove = screen.getByRole("button", { name: "Excluir pergunta 1" });
		expect(remove).toHaveAttribute("aria-disabled", "true");
		expect(remove).toHaveAccessibleDescription(
			"Não é possível excluir todo o conteúdo",
		);
		await user.click(remove);

		expect(handlers.onDelete).not.toHaveBeenCalled();
	});

	it("Adicionar and Duplicar are disabled at 200 questions with the reason", () => {
		renderList(
			Array.from({ length: QUIZ_MAX_QUESTIONS }, (_, index) =>
				question(`q-${index}`, null),
			),
		);

		for (const button of [
			screen.getByRole("button", { name: "Adicionar" }),
			screen.getByRole("button", { name: "Duplicar pergunta 1" }),
		]) {
			expect(button).toHaveAttribute("aria-disabled", "true");
			expect(button).toHaveAccessibleDescription(
				"Limite de 200 perguntas atingido",
			);
		}
		// 200 sortable items are slow to render and query in jsdom.
	}, 15_000);
});
