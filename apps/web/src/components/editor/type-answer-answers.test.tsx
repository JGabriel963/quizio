import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveTrackerProvider } from "@/lib/save-tracker";

import { TypeAnswerAnswers } from "./type-answer-answers";

function renderAnswers(
	acceptedAnswers: (string | null)[] = [null],
	hint = false,
) {
	const onSaveAnswer = vi.fn(async () => {});
	const onChange = vi.fn();
	render(
		<SaveTrackerProvider>
			<TypeAnswerAnswers
				questionId="q1"
				acceptedAnswers={acceptedAnswers}
				hint={hint}
				onSaveAnswer={onSaveAnswer}
				onChange={onChange}
			/>
		</SaveTrackerProvider>,
	);
	return { onSaveAnswer, onChange, user: userEvent.setup() };
}

describe("TypeAnswerAnswers (spec 031)", () => {
	it("starts with the main answer and Adicionar outras respostas aceitas", () => {
		renderAnswers();

		expect(
			screen.getByRole("textbox", { name: "Resposta aceita" }),
		).toHaveValue("");
		expect(
			screen.getByRole("button", {
				name: "Adicionar outras respostas aceitas",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Outras respostas aceitas")).toBeNull();
	});

	it("adds fields up to four, then hides Adicionar mais", async () => {
		const { onChange, user } = renderAnswers();

		await user.click(
			screen.getByRole("button", {
				name: "Adicionar outras respostas aceitas",
			}),
		);
		expect(onChange).toHaveBeenCalledWith({ kind: "acceptedAnswerAdded" });

		renderAnswers(["Pedro", "Jesus", null]);
		expect(screen.getByText("Outras respostas aceitas")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar mais" }),
		).toBeInTheDocument();
	});

	it("hides Adicionar mais with four accepted answers", () => {
		renderAnswers(["Pedro", "Jesus", "Exemplo 3", "Exemplo 4"]);

		expect(screen.getAllByRole("textbox")).toHaveLength(4);
		expect(screen.queryByRole("button", { name: "Adicionar mais" })).toBeNull();
	});

	it("counts the characters left while editing", async () => {
		const { user } = renderAnswers(["Pedro", null]);
		const field = screen.getByRole("textbox", {
			name: "Outra resposta aceita 1",
		});

		await user.click(field);
		await user.type(field, "Jesus");

		expect(screen.getByText("15 caracteres restantes")).toHaveTextContent("15");
	});

	it("stops at 20 characters", async () => {
		const { user } = renderAnswers();
		const field = screen.getByRole("textbox", { name: "Resposta aceita" });

		await user.type(field, "a".repeat(25));

		expect(field).toHaveValue("a".repeat(20));
	});

	it("removes an emptied extra field on blur", async () => {
		const { onChange, user } = renderAnswers(["Pedro", "Jesus"]);
		const field = screen.getByRole("textbox", {
			name: "Outra resposta aceita 1",
		});

		await user.clear(field);
		await user.tab();

		await vi.waitFor(() =>
			expect(onChange).toHaveBeenCalledWith({
				kind: "acceptedAnswerRemoved",
				index: 1,
			}),
		);
	});

	it("never removes the main field", async () => {
		const { onChange, user } = renderAnswers(["Pedro"]);
		const field = screen.getByRole("textbox", { name: "Resposta aceita" });

		await user.clear(field);
		await user.tab();

		expect(onChange).not.toHaveBeenCalled();
	});

	it("hints Adicione uma resposta aceita", () => {
		renderAnswers([null], true);

		expect(
			screen.getByRole("textbox", { name: "Resposta aceita" }),
		).toHaveAccessibleDescription("Adicione uma resposta aceita");
	});
});
