import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuestionPropertiesPanel } from "./question-properties-panel";

function renderPanel(questionCount: number) {
	const handlers = { onDelete: vi.fn(), onDuplicate: vi.fn() };
	render(
		<QuestionPropertiesPanel
			question={{ id: "a", type: "quiz", text: "A" }}
			questionCount={questionCount}
			{...handlers}
		/>,
	);
	return { handlers, user: userEvent.setup() };
}

describe("QuestionPropertiesPanel", () => {
	it("shows the type read-only", () => {
		renderPanel(2);

		expect(
			screen.getByRole("heading", { name: "Propriedades da pergunta" }),
		).toBeInTheDocument();
		expect(screen.getByText("Tipo de pergunta")).toBeInTheDocument();
		expect(screen.getByText("Quiz")).toBeInTheDocument();
		expect(screen.queryByRole("combobox")).toBeNull();
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
