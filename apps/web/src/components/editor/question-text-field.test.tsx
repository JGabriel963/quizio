import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";

import { QuestionTextField } from "./question-text-field";

function renderField(initialText: string | null = null, hint = false) {
	const tracker = createSaveTracker();
	const onSave = vi.fn(async (_text: string | null) => {});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<QuestionTextField
				questionId="a"
				initialText={initialText}
				hint={hint}
				onSave={onSave}
			/>
		</SaveTrackerProvider>,
	);
	return { onSave, tracker, user: userEvent.setup() };
}

const textField = () => screen.getByRole("textbox", { name: "Pergunta" });

describe("QuestionTextField", () => {
	it("keeps the first 160 characters when typing or pasting 170", async () => {
		const { user } = renderField();

		await user.click(textField());
		await user.paste(`${"é".repeat(159)}🎉${"x".repeat(10)}`);

		expect(textField()).toHaveValue(`${"é".repeat(159)}🎉`);
		expect(screen.getByText("0 caracteres restantes")).toBeInTheDocument();
	});

	it("shows the remaining characters only while the field is focused", async () => {
		const { user } = renderField("teste");

		expect(screen.queryByText(/caracteres restantes/)).toBeNull();
		await user.click(textField());

		expect(screen.getByText("155 caracteres restantes")).toBeInTheDocument();
		await user.type(textField(), "s");
		expect(screen.getByText("154 caracteres restantes")).toBeInTheDocument();

		await user.tab();
		expect(screen.queryByText(/caracteres restantes/)).toBeNull();
	});

	it("an empty focused field shows the whole limit", async () => {
		const { user } = renderField();

		await user.click(textField());

		expect(screen.getByText("160 caracteres restantes")).toBeInTheDocument();
	});

	it("autosaves the text", async () => {
		const { onSave, tracker, user } = renderField();

		await user.type(textField(), "Qual é a capital do Brasil?");
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith("Qual é a capital do Brasil?");
	});

	it("hints an empty text only when asked to, and describes the field with it", async () => {
		const { user } = renderField(null, true);

		expect(textField()).toHaveAccessibleDescription(
			"Nenhuma pergunta foi adicionada.",
		);
		await user.type(textField(), "Capital?");

		expect(screen.queryByText("Nenhuma pergunta foi adicionada.")).toBeNull();
	});

	it("shows no hint by default", () => {
		renderField();

		expect(screen.queryByText("Nenhuma pergunta foi adicionada.")).toBeNull();
	});

	it("uses the Kahoot placeholder", () => {
		renderField();

		expect(textField()).toHaveAttribute(
			"placeholder",
			"Comece a digitar a pergunta",
		);
	});
});
