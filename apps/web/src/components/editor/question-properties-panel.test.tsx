import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";

import { QuestionPropertiesPanel } from "./question-properties-panel";

function renderPanel(
	questionCount: number,
	question: QuestionData = { ...blankQuestion("a"), text: "A" },
) {
	const handlers = {
		onDelete: vi.fn(),
		onDuplicate: vi.fn(),
		onChange: vi.fn(),
		onApplyTimeLimitToAll: vi.fn(),
	};
	render(
		<QuestionPropertiesPanel
			question={question}
			questionCount={questionCount}
			{...handlers}
		/>,
	);
	return { handlers, user: userEvent.setup() };
}

const optionLabels = (name: string) =>
	within(screen.getByRole("combobox", { name }))
		.getAllByRole("option")
		.map((option) => option.textContent);

describe("QuestionPropertiesPanel", () => {
	it("shows the type read-only", () => {
		renderPanel(2);

		expect(
			screen.getByRole("heading", { name: "Propriedades da pergunta" }),
		).toBeInTheDocument();
		expect(screen.getByText("Tipo de pergunta")).toBeInTheDocument();
		expect(screen.getByText("Quiz")).toBeInTheDocument();
		expect(screen.queryByRole("combobox", { name: /tipo/i })).toBeNull();
	});

	it("offers the time limits with 20 seconds chosen", () => {
		renderPanel(2);

		expect(
			screen.getByRole("combobox", { name: "Limite de tempo" }),
		).toHaveValue("20");
		expect(optionLabels("Limite de tempo")).toEqual([
			"5 segundos",
			"10 segundos",
			"15 segundos",
			"20 segundos",
			"30 segundos",
			"45 segundos",
			"1 minuto",
			"1 minuto 30 segundos",
			"2 minutos",
			"3 minutos",
			"4 minutos",
		]);
	});

	it("sends time, points and answer options when chosen", async () => {
		const { handlers, user } = renderPanel(2);

		await user.selectOptions(
			screen.getByRole("combobox", { name: "Limite de tempo" }),
			"1 minuto 30 segundos",
		);
		await user.selectOptions(
			screen.getByRole("combobox", { name: "Pontos" }),
			"Pontos em dobro",
		);
		await user.selectOptions(
			screen.getByRole("combobox", { name: "Opções de resposta" }),
			"Múltipla escolha",
		);

		expect(handlers.onChange.mock.calls).toEqual([
			[{ kind: "timeLimit", seconds: 90 }],
			[{ kind: "points", points: "double" }],
			[{ kind: "selection", selection: "multiple" }],
		]);
	});

	it("lists points and answer options", () => {
		renderPanel(2);

		expect(optionLabels("Pontos")).toEqual([
			"Padrão",
			"Pontos em dobro",
			"Sem pontos",
		]);
		expect(optionLabels("Opções de resposta")).toEqual([
			"Seleção simples",
			"Múltipla escolha",
		]);
	});

	it("shows the question's current choices", () => {
		renderPanel(2, {
			...blankQuestion("a"),
			timeLimitSeconds: 45,
			points: "noPoints",
			selection: "multiple",
		});

		expect(
			screen.getByRole("combobox", { name: "Limite de tempo" }),
		).toHaveValue("45");
		expect(screen.getByRole("combobox", { name: "Pontos" })).toHaveValue(
			"noPoints",
		);
		expect(
			screen.getByRole("combobox", { name: "Opções de resposta" }),
		).toHaveValue("multiple");
	});

	it("Aplicar a todas as perguntas sends the question's time", async () => {
		const { handlers, user } = renderPanel(3, {
			...blankQuestion("a"),
			timeLimitSeconds: 45,
		});

		await user.click(
			screen.getByRole("button", { name: "Aplicar a todas as perguntas" }),
		);

		expect(handlers.onApplyTimeLimitToAll).toHaveBeenCalledWith(45);
	});

	it("Excluir and Duplicar act on the selected question", async () => {
		const { handlers, user } = renderPanel(2);

		await user.click(screen.getByRole("button", { name: "Excluir" }));
		await user.click(screen.getByRole("button", { name: "Duplicar" }));

		expect(handlers.onDelete).toHaveBeenCalledWith("a");
		expect(handlers.onDuplicate).toHaveBeenCalledWith("a");
	});

	it("Excluir follows the list rule for the only question", () => {
		renderPanel(1);

		const remove = screen.getByRole("button", { name: "Excluir" });
		expect(remove).toHaveAttribute("aria-disabled", "true");
		expect(remove).toHaveAccessibleDescription(
			"Não é possível excluir todo o conteúdo",
		);
	});
});
