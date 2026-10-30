import { act, waitFor } from "@testing-library/react";
import type { Editor } from "@tiptap/core";

/**
 * The statement's editor (spec 047) behind its field: Tiptap keeps it on the
 * editable element. jsdom does not type into a `contenteditable` as a browser
 * does, so tests write and select through it; typing for real is the E2E's.
 */
export function statementEditorOf(element: HTMLElement): Editor {
	const editor = (element as HTMLElement & { editor?: Editor }).editor;
	if (!editor) {
		throw new Error("This element is not the statement's editor");
	}
	return editor;
}

/** The field once the editor has mounted (it is built after the first render). */
export async function statementField(
	find: () => HTMLElement,
): Promise<HTMLElement> {
	return waitFor(() => {
		const field = find();
		statementEditorOf(field);
		return field;
	});
}

/** Writes at the cursor, as typing would, with the marks of where it goes. */
export function typeStatement(element: HTMLElement, text: string) {
	act(() => {
		statementEditorOf(element)
			.chain()
			.focus()
			.command(({ tr }) => {
				tr.insertText(text);
				return true;
			})
			.run();
	});
}
