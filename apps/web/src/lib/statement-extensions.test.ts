import { Editor } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { afterEach, describe, expect, it } from "vitest";

import { documentToStatement, statementToDocument } from "./statement-document";
import {
	fitSliceToRoom,
	STATEMENT_EDITOR_OPTIONS,
	statementExtensions,
} from "./statement-extensions";

const editors: Editor[] = [];

function editorWith(text: string, max = 160) {
	const editor = new Editor({
		...STATEMENT_EDITOR_OPTIONS,
		extensions: statementExtensions(max),
		content: statementToDocument(text, {}),
	});
	editors.push(editor);
	return editor;
}

const statementOf = (editor: Editor) => documentToStatement(editor.getJSON());

afterEach(() => {
	for (const editor of editors.splice(0)) {
		editor.destroy();
	}
});

describe("statement extensions (spec 047)", () => {
	it("turning subscript on removes superscript there, and the other way", () => {
		const editor = editorWith("x2");
		// The text starts at position 1, inside the paragraph.
		editor.commands.setTextSelection({ from: 2, to: 3 });

		editor.commands.toggleSuperscript();
		editor.commands.toggleSubscript();
		expect(statementOf(editor).formatting).toEqual({ subscript: [[1, 2]] });

		editor.commands.toggleSuperscript();
		expect(statementOf(editor).formatting).toEqual({ superscript: [[1, 2]] });
	});

	it("bold and italic stay with a subscript", () => {
		const editor = editorWith("x2");
		editor.commands.setTextSelection({ from: 2, to: 3 });

		editor.chain().toggleBold().toggleItalic().toggleSubscript().run();

		expect(statementOf(editor).formatting).toEqual({
			bold: [[1, 2]],
			italic: [[1, 2]],
			subscript: [[1, 2]],
		});
	});

	it("Enter adds no line", () => {
		const editor = editorWith("Capital?");
		editor.commands.setTextSelection(4);

		editor.commands.keyboardShortcut("Enter");
		editor.commands.keyboardShortcut("Shift-Enter");

		expect(editor.getJSON().content).toHaveLength(1);
		expect(statementOf(editor).text).toBe("Capital?");
	});

	it("a pasted slice keeps the four marks and drops the rest", () => {
		const editor = editorWith("");

		editor.view.pasteHTML(
			'<p><b>forte</b> <span style="color: red">vermelho</span> <u>sublinhado</u> <a href="https://exemplo.test">link</a> <i>it</i> x<sup>2</sup> H<sub>2</sub>O</p>',
		);

		expect(statementOf(editor)).toEqual({
			text: "forte vermelho sublinhado link it x2 H2O",
			formatting: {
				bold: [[0, 5]],
				italic: [[31, 33]],
				subscript: [[38, 39]],
				superscript: [[35, 36]],
			},
		});
	});

	it("pasted blocks become one line separated by spaces", () => {
		const blocks = editorWith("");
		const lineBreak = editorWith("");
		const plain = editorWith("");

		blocks.view.pasteHTML("<p>um</p><p>dois</p>");
		lineBreak.view.pasteHTML("<p>três<br>quatro</p>");
		plain.view.pasteText("cinco\nseis");

		expect(statementOf(blocks).text).toBe("um dois");
		expect(statementOf(lineBreak).text).toBe("três quatro");
		expect(statementOf(plain).text).toBe("cinco seis");
		expect(blocks.getJSON().content).toHaveLength(1);
	});

	it("refuses a transaction past 160 characters", () => {
		const editor = editorWith("a".repeat(160));
		editor.commands.setTextSelection(161);

		editor.commands.insertContent("b");

		expect(statementOf(editor).text).toBe("a".repeat(160));
	});

	it("accepts a mark change at the limit", () => {
		const editor = editorWith("a".repeat(160));

		editor.chain().selectAll().toggleBold().run();

		expect(statementOf(editor).formatting).toEqual({ bold: [[0, 160]] });
	});

	it("a paste is cut to the room left, counting the selection it replaces", () => {
		const editor = editorWith("a".repeat(158));
		editor.commands.setTextSelection(159);

		editor.view.pasteText("xyz");
		expect(statementOf(editor).text).toBe(`${"a".repeat(158)}xy`);

		editor.commands.setTextSelection({ from: 1, to: 3 });
		editor.view.pasteText("123");
		expect(statementOf(editor).text).toBe(`12${"a".repeat(156)}xy`);
	});

	it("fitSliceToRoom cuts at a grapheme", () => {
		const { schema } = editorWith("");
		const slice = new Slice(Fragment.from(schema.text("ab👍🏽cd")), 0, 0);

		const cut = fitSliceToRoom(slice, 3).content;
		expect(cut.textBetween(0, cut.size)).toBe("ab👍🏽");
		expect(fitSliceToRoom(slice, 0).content.size).toBe(0);
		expect(fitSliceToRoom(slice, 9)).toBe(slice);
	});

	it("a symbol that does not fit changes nothing", () => {
		const editor = editorWith("a".repeat(160));
		editor.commands.setTextSelection(81);

		editor.chain().focus().insertContent("π").run();

		expect(statementOf(editor).text).toBe("a".repeat(160));
	});
});
