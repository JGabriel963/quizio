import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";

import { QuestionList } from "./question-list";

const question = (id: string, text: string | null): QuestionData => ({
	id,
	type: "quiz",
	text,
});

function renderList(questions: QuestionData[], selectedId = questions[0]?.id) {
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

		expect(handlers.onDuplicate).toHaveBeenCalledWith("b");
		expect(handlers.onDelete).toHaveBeenCalledWith("a");
		expect(handlers.onAdd).toHaveBeenCalledOnce();
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
	});
});
