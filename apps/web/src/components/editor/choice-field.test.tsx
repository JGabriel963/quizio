import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";

import { ChoiceField } from "./choice-field";

function renderField({
	text = null,
	correct = false,
	index = 0,
	hint = false,
}: {
	text?: string | null;
	correct?: boolean;
	index?: number;
	hint?: boolean;
} = {}) {
	const tracker = createSaveTracker();
	const calls: string[] = [];
	const onSaveText = vi.fn(async (value: string | null) => {
		calls.push(`text:${value}`);
	});
	const onCorrectChange = vi.fn((value: boolean) => {
		calls.push(`correct:${value}`);
	});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<ChoiceField
				questionId="a"
				choice={{ id: `choice-${index + 1}`, text, correct }}
				index={index}
				hint={hint}
				onSaveText={onSaveText}
				onCorrectChange={onCorrectChange}
			/>
		</SaveTrackerProvider>,
	);
	return {
		calls,
		onSaveText,
		onCorrectChange,
		tracker,
		user: userEvent.setup(),
	};
}

const answer = (position = 1) =>
	screen.getByRole("textbox", { name: `Resposta ${position}` });
const correctMark = (position = 1) =>
	screen.getByRole("checkbox", { name: `Resposta ${position} correta` });

describe("ChoiceField", () => {
	it("shows the Kahoot placeholder, color and shape of its position", () => {
		renderField({ index: 4 });

		expect(answer(5)).toHaveAttribute(
			"placeholder",
			"Adicionar resposta 5 (opcional)",
		);
		const block = answer(5).closest("li");
		const shape = block?.querySelector('[data-slot="answer-shape"]');
		expect(shape).toHaveAttribute("data-shape", "pentagon");
		expect(shape?.parentElement).toHaveClass("bg-answer-teal");
	});

	it("keeps the first 75 characters of a paste", async () => {
		const { user } = renderField();

		await user.click(answer());
		await user.paste("a".repeat(80));

		expect(answer()).toHaveValue("a".repeat(75));
	});

	it("autosaves the answer, blank as null", async () => {
		const { onSaveText, tracker, user } = renderField({ text: "Rio" });

		await user.clear(answer());
		await act(() => tracker.flush());
		expect(onSaveText).toHaveBeenLastCalledWith(null);

		await user.type(answer(), "Brasília");
		await act(() => tracker.flush());
		expect(onSaveText).toHaveBeenLastCalledWith("Brasília");
	});

	it("an empty answer cannot be marked correct", async () => {
		const { user } = renderField();

		expect(correctMark()).toHaveAttribute("aria-disabled", "true");
		await user.type(answer(), "Brasília");

		expect(correctMark()).not.toHaveAttribute("aria-disabled", "true");
	});

	it("marking correct sends the pending text first", async () => {
		const { calls, user } = renderField();

		await user.type(answer(), "Brasília");
		await user.click(correctMark());

		await vi.waitFor(() =>
			expect(calls).toEqual(["text:Brasília", "correct:true"]),
		);
	});

	it("a filled answer takes its position's color", () => {
		renderField({ text: "Salvador", index: 5 });

		expect(answer(6).parentElement).toHaveClass("bg-answer-purple");
	});

	it("shows the correct state", () => {
		renderField({ text: "Brasília", correct: true });

		expect(correctMark()).toBeChecked();
	});

	it("shows the missing answer hint until something is typed", async () => {
		const { user } = renderField({ hint: true });

		expect(answer()).toHaveAccessibleDescription(
			"A resposta 1 não foi adicionada",
		);
		await user.type(answer(), "B");

		expect(screen.queryByText("A resposta 1 não foi adicionada")).toBeNull();
	});
});
