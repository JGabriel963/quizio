import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";

import { QuestionTextField } from "./question-text-field";

function renderField(initialText: string | null = null) {
	const tracker = createSaveTracker();
	const onSave = vi.fn(async (_text: string | null) => {});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<QuestionTextField
				questionId="a"
				initialText={initialText}
				onSave={onSave}
			/>
		</SaveTrackerProvider>,
	);
	return { onSave, tracker, user: userEvent.setup() };
}

const textField = () => screen.getByRole("textbox", { name: "Pergunta" });

describe("QuestionTextField", () => {
	it("keeps the first 120 characters when typing or pasting 130", async () => {
		const { user } = renderField();

		await user.click(textField());
		await user.paste(`${"é".repeat(119)}🎉${"x".repeat(10)}`);

		expect(textField()).toHaveValue(`${"é".repeat(119)}🎉`);
	});

	it("shows remaining characters from 100 on", async () => {
		const { user } = renderField("a".repeat(99));

		expect(screen.queryByText(/caracteres restantes/)).toBeNull();
		await user.type(textField(), "b");

		expect(screen.getByText("20 caracteres restantes")).toBeInTheDocument();
	});

	it("autosaves the text", async () => {
		const { onSave, tracker, user } = renderField();

		await user.type(textField(), "Qual é a capital do Brasil?");
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith("Qual é a capital do Brasil?");
	});

	it("uses the Kahoot placeholder", () => {
		renderField();

		expect(textField()).toHaveAttribute(
			"placeholder",
			"Comece a digitar a pergunta",
		);
	});
});
