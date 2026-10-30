import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createSaveTracker, SaveTrackerProvider } from "@/lib/save-tracker";
import {
	editorOf,
	formattedField,
	typeInEditor,
} from "@/testing/formatted-text-editor";

import { ChoiceField } from "./choice-field";
import type { SavedText } from "./formatted-text-field";

async function renderField({
	text = null,
	formatting = {},
	correct = false,
	index = 0,
	hint = false,
}: {
	text?: string | null;
	formatting?: TextFormatting;
	correct?: boolean;
	index?: number;
	hint?: boolean;
} = {}) {
	const tracker = createSaveTracker();
	const calls: string[] = [];
	const onSaveText = vi.fn(async (value: SavedText) => {
		calls.push(`text:${value.text}`);
	});
	const onCorrectChange = vi.fn((value: boolean) => {
		calls.push(`correct:${value}`);
	});
	render(
		<SaveTrackerProvider tracker={tracker}>
			<button type="button">Fora</button>
			<ChoiceField
				questionId="a"
				choice={{
					id: `choice-${index + 1}`,
					text,
					textFormatting: formatting,
					image: null,
					correct,
				}}
				index={index}
				hint={hint}
				onSaveText={onSaveText}
				onCorrectChange={onCorrectChange}
			/>
		</SaveTrackerProvider>,
	);
	const field = await formattedField(() => answer(index + 1));
	return {
		calls,
		field,
		editor: editorOf(field),
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
const toolbar = (position = 1) =>
	screen.queryByRole("toolbar", { name: `Formatação da resposta ${position}` });

describe("ChoiceField", () => {
	it("shows the Kahoot placeholder, color and shape of its position", async () => {
		await renderField({ index: 4 });

		expect(answer(5)).toHaveAttribute(
			"aria-placeholder",
			"Adicionar resposta 5 (opcional)",
		);
		const block = answer(5).closest("li");
		const shape = block?.querySelector('[data-slot="answer-shape"]');
		expect(shape).toHaveAttribute("data-shape", "pentagon");
		expect(shape?.parentElement).toHaveClass("bg-answer-teal");
	});

	it("keeps the first 75 characters of a paste", async () => {
		const { editor, field } = await renderField();
		act(() => field.focus());

		act(() => editor.view.pasteText("a".repeat(80)));

		expect(field).toHaveTextContent("a".repeat(75), {
			normalizeWhitespace: false,
		});
		expect(field.textContent).toHaveLength(75);
	});

	it("counts the characters left while it has the focus", async () => {
		const { editor, field, user } = await renderField({ text: "Rio" });

		expect(screen.queryByText("72 caracteres restantes")).toBeNull();
		act(() => {
			field.focus();
			editor.commands.setTextSelection(4);
		});
		expect(screen.getByText("72 caracteres restantes")).toBeInTheDocument();

		typeInEditor(field, " de Janeiro");
		expect(screen.getByText("61 caracteres restantes")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Fora" }));
		expect(screen.queryByText(/caracteres restantes/)).toBeNull();
	});

	it("the counter ignores the formatting", async () => {
		const { editor, field } = await renderField({ text: "Capital do Brasil" });
		act(() => field.focus());
		expect(screen.getByText("58 caracteres restantes")).toBeInTheDocument();

		act(() => {
			editor.chain().selectAll().toggleBold().run();
		});

		expect(screen.getByText("58 caracteres restantes")).toBeInTheDocument();
	});

	it("saves the text and its formatting, blank as null with none", async () => {
		const { editor, field, onSaveText, tracker } = await renderField({
			text: "H2O",
		});
		act(() => {
			field.focus();
			editor.commands.setTextSelection({ from: 2, to: 3 });
			editor.commands.toggleSubscript();
		});
		await act(() => tracker.flush());
		expect(onSaveText).toHaveBeenLastCalledWith({
			text: "H2O",
			formatting: { subscript: [[1, 2]] },
		});

		act(() => {
			editor.chain().selectAll().deleteSelection().run();
		});
		await act(() => tracker.flush());
		expect(onSaveText).toHaveBeenLastCalledWith({ text: null, formatting: {} });
	});

	it("the answer is in normal weight", async () => {
		const { field } = await renderField({ text: "Brasília" });

		expect(field).toHaveClass("font-normal");
		expect(field).not.toHaveClass("font-bold");
	});

	it("the toolbar shows with the focused answer only", async () => {
		const { field, user } = await renderField({ text: "Rio" });
		expect(toolbar()).toBeNull();

		act(() => field.focus());
		expect(toolbar()).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Fora" }));
		expect(toolbar()).toBeNull();
	});

	it("the toolbar goes above the first row and below the others", async () => {
		const placeOf = async (index: number) => {
			const { field, editor } = await renderField({ text: "Rio", index });
			act(() => field.focus());
			const bar = toolbar(index + 1);
			act(() => {
				editor.commands.blur();
				field.blur();
			});
			return bar;
		};

		const first = await placeOf(0);
		expect(first).toHaveClass("bottom-full");
		expect(first).not.toHaveClass("top-full");

		// Above only when the answers sit in two columns.
		const second = await placeOf(1);
		expect(second).toHaveClass("top-full", "@xl:bottom-full");

		const third = await placeOf(2);
		expect(third).toHaveClass("top-full");
		expect(third).not.toHaveClass("@xl:bottom-full");
	});

	it("an empty answer cannot be marked correct", async () => {
		const { field } = await renderField();

		expect(correctMark()).toHaveAttribute("aria-disabled", "true");
		act(() => field.focus());
		typeInEditor(field, "Brasília");

		expect(correctMark()).not.toHaveAttribute("aria-disabled", "true");
	});

	it("marking correct sends the pending text first", async () => {
		const { calls, field, user } = await renderField();
		act(() => field.focus());
		typeInEditor(field, "Brasília");

		await user.click(correctMark());

		await vi.waitFor(() =>
			expect(calls).toEqual(["text:Brasília", "correct:true"]),
		);
	});

	it("a filled answer takes its position's color", async () => {
		await renderField({ text: "Salvador", index: 5 });

		expect(answer(6).closest("li")?.firstElementChild).toHaveClass(
			"bg-answer-purple",
		);
	});

	it("shows the correct state", async () => {
		await renderField({ text: "Brasília", correct: true });

		expect(correctMark()).toBeChecked();
	});

	it("shows the missing answer hint until something is typed", async () => {
		const { field } = await renderField({ hint: true });

		expect(field).toHaveAccessibleDescription(
			"A resposta 1 não foi adicionada",
		);
		act(() => field.focus());
		typeInEditor(field, "B");

		expect(screen.queryByText("A resposta 1 não foi adicionada")).toBeNull();
	});
});
