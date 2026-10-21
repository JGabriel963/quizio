import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuestionData } from "@/lib/api-types";

import { QuestionPropertiesMenu } from "./question-properties-menu";

function renderMenu(
	questionCount = 2,
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
		<QuestionPropertiesMenu
			question={question}
			questionCount={questionCount}
			{...handlers}
		/>,
	);
	return { handlers, user: userEvent.setup() };
}

async function openItem(user: UserEvent, item: string) {
	await user.click(
		screen.getByRole("button", { name: "Propriedades da pergunta" }),
	);
	await user.click(await screen.findByRole("menuitem", { name: item }));
}

const dialog = (name: string) => screen.findByRole("dialog", { name });

describe("QuestionPropertiesMenu", () => {
	it("lists the properties and the question's actions, as in Kahoot", async () => {
		const { user } = renderMenu();

		await user.click(
			screen.getByRole("button", { name: "Propriedades da pergunta" }),
		);

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual([
			"Alterar tipo de pergunta",
			"Definir limite de tempo",
			"Pontos",
			"Opções de resposta",
			"Duplicar",
			"Excluir",
		]);
	});

	it("true/false questions have no answer options", async () => {
		const { user } = renderMenu(2, blankQuestion("a", "trueFalse"));

		await user.click(
			screen.getByRole("button", { name: "Propriedades da pergunta" }),
		);

		expect(
			await screen.findByRole("menuitem", { name: "Pontos" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: "Opções de resposta" }),
		).toBeNull();
	});

	it("the time limit is saved only on Pronto", async () => {
		const { handlers, user } = renderMenu();

		await openItem(user, "Definir limite de tempo");
		const time = await dialog("Limite de tempo");
		expect(
			within(time).getByRole("radio", { name: "20 segundos" }),
		).toBeChecked();
		await user.click(
			within(time).getByRole("radio", { name: "1 minuto 30 segundos" }),
		);
		expect(handlers.onChange).not.toHaveBeenCalled();
		await user.click(within(time).getByRole("button", { name: "Pronto" }));

		expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "timeLimit",
			seconds: 90,
		});
	});

	it("Cancelar keeps the points", async () => {
		const { handlers, user } = renderMenu();

		await openItem(user, "Pontos");
		const points = await dialog("Pontos");
		await user.click(
			within(points).getByRole("radio", { name: /Pontos em dobro/ }),
		);
		await user.click(within(points).getByRole("button", { name: "Cancelar" }));

		expect(handlers.onChange).not.toHaveBeenCalled();
	});

	it("applies the chosen time to every question", async () => {
		const { handlers, user } = renderMenu();

		await openItem(user, "Definir limite de tempo");
		const time = await dialog("Limite de tempo");
		await user.click(within(time).getByRole("radio", { name: "45 segundos" }));
		await user.click(
			within(time).getByRole("button", {
				name: "Aplicar a todas as perguntas",
			}),
		);

		expect(handlers.onApplyTimeLimitToAll).toHaveBeenCalledExactlyOnceWith(45);
	});

	it("picking a type changes it at once", async () => {
		const { handlers, user } = renderMenu();

		await openItem(user, "Alterar tipo de pergunta");
		const types = await dialog("Alterar tipo de pergunta");
		await user.click(
			within(types).getByRole("radio", { name: "Verdadeiro ou falso" }),
		);

		expect(handlers.onChangeType).toHaveBeenCalledExactlyOnceWith("trueFalse");
	});

	it("saves the answer options on Pronto", async () => {
		const { handlers, user } = renderMenu();

		await openItem(user, "Opções de resposta");
		const options = await dialog("Opções de resposta");
		await user.click(
			within(options).getByRole("radio", { name: /Múltipla escolha/ }),
		);
		await user.click(within(options).getByRole("button", { name: "Pronto" }));

		expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
			kind: "selection",
			selection: "multiple",
		});
	});

	it("duplicates and deletes; the only question cannot be deleted", async () => {
		const { handlers, user } = renderMenu();
		await openItem(user, "Duplicar");
		expect(handlers.onDuplicate).toHaveBeenCalledWith("a");
		await openItem(user, "Excluir");
		expect(handlers.onDelete).toHaveBeenCalledWith("a");
	});

	it("Excluir is disabled for the only question", async () => {
		const { user } = renderMenu(1);

		await user.click(
			screen.getByRole("button", { name: "Propriedades da pergunta" }),
		);

		expect(
			await screen.findByRole("menuitem", { name: "Excluir" }),
		).toHaveAttribute("aria-disabled", "true");
	});

	it("a type answer offers times from 20 s (spec 031, RN-06)", async () => {
		const { user } = renderMenu(2, {
			...blankQuestion("a", "typeAnswer"),
			text: "Quem?",
		});

		await openItem(user, "Definir limite de tempo");
		const time = await dialog("Limite de tempo");

		expect(
			within(time).queryByRole("radio", { name: "10 segundos" }),
		).toBeNull();
		expect(
			within(time).getByRole("radio", { name: "30 segundos" }),
		).toBeChecked();
	});
});
