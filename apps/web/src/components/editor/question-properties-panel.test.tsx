import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
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
		onChangeType: vi.fn(),
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

const select = (name: string) => screen.getByRole("combobox", { name });

/** Opens the list of a select and returns its option names; Escape closes it. */
async function optionLabels(user: UserEvent, name: string) {
	await user.click(select(name));
	const labels = (await screen.findAllByRole("option")).map((option) =>
		option.textContent?.trim(),
	);
	await user.keyboard("{Escape}");
	await vi.waitFor(() => expect(screen.queryByRole("option")).toBeNull());
	return labels;
}

async function choose(user: UserEvent, name: string, option: string) {
	await user.click(select(name));
	await user.click(await screen.findByRole("option", { name: option }));
	await vi.waitFor(() => expect(screen.queryByRole("option")).toBeNull());
}

describe("QuestionPropertiesPanel", () => {
	it("changes the question type from a list of cards with the type's icon", async () => {
		const { handlers, user } = renderPanel(2);

		expect(
			screen.getByRole("heading", { name: "Propriedades da pergunta" }),
		).toBeInTheDocument();
		expect(select("Tipo de pergunta")).toHaveTextContent("Quiz");
		expect(
			select("Tipo de pergunta").querySelector(
				"[data-slot=question-type-icon]",
			),
		).toBeInTheDocument();

		await user.click(select("Tipo de pergunta"));
		const options = await screen.findAllByRole("option");
		expect(options.map((option) => option.textContent?.trim())).toEqual([
			"Quiz",
			"Verdadeiro ou falso",
		]);
		expect(
			screen.getByRole("group", { name: "Testar conhecimento" }),
		).toBeInTheDocument();
		expect(options[0]).toHaveAttribute("aria-selected", "true");
		expect(
			options.every((option) =>
				option.querySelector("[data-slot=question-type-icon]"),
			),
		).toBe(true);
		await user.click(
			screen.getByRole("option", { name: "Verdadeiro ou falso" }),
		);

		expect(handlers.onChangeType).toHaveBeenCalledExactlyOnceWith("trueFalse");
		expect(handlers.onChange).not.toHaveBeenCalled();
	});

	it("a true/false question has its type, time and points, and no answer options", async () => {
		const { handlers, user } = renderPanel(2, {
			...blankQuestion("a", "trueFalse"),
			text: "O céu é azul",
		});

		expect(select("Tipo de pergunta")).toHaveTextContent("Verdadeiro ou falso");
		expect(select("Limite de tempo")).toHaveTextContent("20 segundos");
		expect(select("Pontos")).toHaveTextContent("Padrão");
		expect(
			screen.queryByRole("combobox", { name: "Opções de resposta" }),
		).toBeNull();
		await choose(user, "Pontos", "Pontos em dobro");

		expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "points",
			points: "double",
		});
	});

	it("offers the time limits with 20 seconds chosen", async () => {
		const { user } = renderPanel(2);

		expect(select("Limite de tempo")).toHaveTextContent("20 segundos");
		expect(await optionLabels(user, "Limite de tempo")).toEqual([
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

		await choose(user, "Limite de tempo", "1 minuto 30 segundos");
		await choose(user, "Pontos", "Pontos em dobro");
		await choose(user, "Opções de resposta", "Múltipla escolha");

		expect(handlers.onChange.mock.calls).toEqual([
			[{ kind: "timeLimit", seconds: 90 }],
			[{ kind: "points", points: "double" }],
			[{ kind: "selection", selection: "multiple" }],
		]);
	});

	it("lists points and answer options", async () => {
		const { user } = renderPanel(2);

		expect(await optionLabels(user, "Pontos")).toEqual([
			"Padrão",
			"Pontos em dobro",
			"Sem pontos",
		]);
		expect(await optionLabels(user, "Opções de resposta")).toEqual([
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

		expect(select("Limite de tempo")).toHaveTextContent("45 segundos");
		expect(select("Pontos")).toHaveTextContent("Sem pontos");
		expect(select("Opções de resposta")).toHaveTextContent("Múltipla escolha");
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
