import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";

import { QuizTitleField } from "./quiz-title-field";

function renderField(initialTitle: string | null = null) {
	const tracker = createSaveTracker();
	const onSave = vi.fn(async (_title: string | null) => {});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<QuizTitleField initialTitle={initialTitle} onSave={onSave} />
		</SaveTrackerProvider>,
	);
	return { onSave, tracker, user: userEvent.setup() };
}

const titleField = () =>
	screen.getByRole("textbox", { name: "Título do quiz" });

describe("QuizTitleField", () => {
	it("caps the title at 95 characters when typing or pasting", async () => {
		const { user } = renderField();

		await user.click(titleField());
		await user.paste("á".repeat(100));

		expect(titleField()).toHaveValue("á".repeat(95));
	});

	it("autosaves the title", async () => {
		const { onSave, tracker, user } = renderField();

		await user.type(titleField(), "Geografia");
		await act(() => tracker.flush());

		expect(onSave).toHaveBeenLastCalledWith("Geografia");
	});

	it("sends a cleared title as null", async () => {
		const { onSave, user } = renderField("Geografia");

		await user.clear(titleField());
		await user.tab();

		expect(onSave).toHaveBeenLastCalledWith(null);
	});
});
