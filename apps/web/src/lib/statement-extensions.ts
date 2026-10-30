import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { type EditorOptions, Extension } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Document } from "@tiptap/extension-document";
import { Italic } from "@tiptap/extension-italic";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Text } from "@tiptap/extension-text";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { Fragment, type Node, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const STATEMENT_PLACEHOLDER = "Comece a digitar a pergunta";

/**
 * No Markdown shortcuts: "2*3*4" in a math question must not turn "3"
 * italic, nor "**" bold.
 */
export const STATEMENT_EDITOR_OPTIONS = {
	enableInputRules: false,
	enablePasteRules: false,
} satisfies Partial<EditorOptions>;

/** The inline nodes of a pasted slice in one line, its blocks joined by a space (spec 003, RN-10). */
function oneLine(slice: Slice): Slice {
	const nodes: Node[] = [];
	let blocks = 0;
	slice.content.forEach((node) => {
		if (node.isInline) {
			nodes.push(node);
			return;
		}
		if (blocks > 0 && node.content.size > 0) {
			nodes.push(node.type.schema.text(" "));
		}
		blocks++;
		node.forEach((child) => {
			nodes.push(child);
		});
	});
	return blocks === 0 ? slice : new Slice(Fragment.fromArray(nodes), 0, 0);
}

/**
 * A one-line slice cut to `room` user-perceived characters (spec 003,
 * RN-10; spec 047, RN-07): the text nodes that fit, and the next one cut
 * without splitting an accent or an emoji.
 */
export function fitSliceToRoom(slice: Slice, room: number): Slice {
	const text = slice.content.textBetween(0, slice.content.size);
	if (characterCount(text) <= room) {
		return slice;
	}
	const nodes: Node[] = [];
	let left = room;
	slice.content.forEach((node) => {
		if (left <= 0) {
			return;
		}
		const piece = node.text ?? "";
		const count = characterCount(piece);
		if (count <= left) {
			nodes.push(node);
			left -= count;
			return;
		}
		const cut = truncateCharacters(piece, left);
		if (cut !== "") {
			nodes.push(node.type.schema.text(cut, node.marks));
		}
		left = 0;
	});
	return new Slice(Fragment.fromArray(nodes), 0, 0);
}

/** One sentence: Enter adds no line, and what is pasted comes in one line. */
const StatementLine = Extension.create({
	name: "statementLine",

	addKeyboardShortcuts() {
		const stay = () => true;
		return { Enter: stay, "Shift-Enter": stay, "Mod-Enter": stay };
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("statementLine"),
				props: {
					// The schema has no line break: a <br> would glue two words.
					transformPastedHTML: (html) => html.replace(/<br\s*\/?>/gi, " "),
					transformPastedText: (text) => text.replace(/\r?\n/g, " "),
					transformPasted: (slice) => oneLine(slice),
				},
			}),
		];
	},
});

/**
 * The statement's limit in user-perceived characters, as the core counts it
 * (spec 047, RN-07, RN-08, RN-14): a change that would pass it is refused,
 * unless it does not make the text longer (a mark, a deletion), and a paste
 * is cut to the room left.
 */
const StatementLimit = Extension.create<{ max: number }>({
	name: "statementLimit",

	addOptions() {
		return { max: QUESTION_TEXT_MAX_LENGTH };
	},

	addProseMirrorPlugins() {
		const { max } = this.options;
		return [
			new Plugin({
				key: new PluginKey("statementLimit"),
				filterTransaction: (transaction, state) => {
					if (!transaction.docChanged) {
						return true;
					}
					const after = characterCount(transaction.doc.textContent);
					return after <= max || after <= characterCount(state.doc.textContent);
				},
				props: {
					transformPasted: (slice, view) => {
						const { doc, selection } = view.state;
						const kept =
							characterCount(doc.textContent) -
							characterCount(doc.textBetween(selection.from, selection.to));
						// Tiptap runs the later extensions' plugins first: the slice may
						// still have its blocks here.
						return fitSliceToRoom(oneLine(slice), Math.max(0, max - kept));
					},
				},
			}),
		];
	},
});

/**
 * The statement's editor (spec 047, ADR 0025): one paragraph of text with the
 * four marks and nothing else, so whatever else a paste brings is dropped.
 * Subscript and superscript exclude each other (RN-04); the marks bring their
 * shortcuts, Mod-B, Mod-I, Mod-, and Mod-. (RN-06).
 */
export function statementExtensions(max: number = QUESTION_TEXT_MAX_LENGTH) {
	return [
		Document.extend({ content: "paragraph" }),
		Paragraph,
		Text,
		Bold,
		Italic,
		Subscript.extend({ excludes: "superscript" }),
		Superscript.extend({ excludes: "subscript" }),
		UndoRedo,
		Placeholder.configure({ placeholder: STATEMENT_PLACEHOLDER }),
		StatementLine,
		StatementLimit.configure({ max }),
	];
}
