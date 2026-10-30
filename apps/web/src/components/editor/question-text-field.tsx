import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import {
	TEXT_MARKS,
	type TextFormatting,
	type TextMark,
} from "@quizio/core/shared/domain/text-formatting";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { type FocusEvent, useId, useState } from "react";

import { FormattedText } from "@/components/quiz/formatted-text";
import { MISSING_QUESTION_TEXT_HINT } from "@/lib/question-labels";
import {
	documentToStatement,
	statementToDocument,
} from "@/lib/statement-document";
import {
	STATEMENT_EDITOR_OPTIONS,
	STATEMENT_PLACEHOLDER,
	statementExtensions,
} from "@/lib/statement-extensions";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { EditorHint } from "./editor-hint";
import { FormattingToolbar } from "./formatting-toolbar";
import { SymbolDialog } from "./symbol-dialog";

/** The statement as the editor saves it: its text and the marked stretches. */
export interface Statement {
	text: string | null;
	formatting: TextFormatting;
}

const NOTHING_ACTIVE: Record<TextMark, boolean> = {
	bold: false,
	italic: false,
	subscript: false,
	superscript: false,
};

/**
 * The box of the statement. Grows with the text up to a few lines, then
 * scrolls; the text is centered, in normal weight so bold stands out (spec 047,
 * RN-24), and the placeholder is drawn over the empty paragraph.
 */
const FIELD_CLASSES =
	"block max-h-36 min-h-0 overflow-y-auto rounded-md bg-card px-4 py-4 text-center font-normal text-lg leading-snug shadow-press-light outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-primary/25 sm:max-h-44 sm:px-12 sm:text-2xl xl:max-h-52 xl:py-5 xl:text-3xl [&_p.is-editor-empty]:relative [&_p.is-editor-empty]:before:pointer-events-none [&_p.is-editor-empty]:before:absolute [&_p.is-editor-empty]:before:inset-x-0 [&_p.is-editor-empty]:before:text-muted-foreground [&_p.is-editor-empty]:before:content-[attr(data-placeholder)]";

/**
 * Question text with its formatting (spec 003, RN-10; spec 047), autosaved
 * and capped at the core's limit. While the statement or its bar has the
 * focus, the formatting bar floats above it (RN-01) and the characters left
 * show in the corner, counting the text only (RN-08). It is one sentence:
 * Enter adds no line, and a paste comes in one line, keeping only the four
 * marks (RN-07, RN-09). Ω opens "Insira um símbolo" (RN-11 to RN-14).
 */
export function QuestionTextField({
	questionId,
	initialText,
	initialFormatting,
	hint,
	tip,
	onSave,
}: {
	questionId: string;
	initialText: string | null;
	initialFormatting: TextFormatting;
	/** Shows "Nenhuma pergunta foi adicionada." while the field is empty. */
	hint: boolean;
	/** What to write, shown below while the field is edited (spec 033, RN-06). */
	tip?: string;
	onSave: (statement: Statement) => Promise<unknown>;
}) {
	const hintId = useId();
	const tipId = useId();
	const [focused, setFocused] = useState(false);
	const [symbolsOpen, setSymbolsOpen] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:text`,
		initialValue: { text: initialText ?? "", formatting: initialFormatting },
		save: ({ text, formatting }) =>
			onSave(
				text.trim() === ""
					? { text: null, formatting: {} }
					: { text, formatting },
			),
	});
	const remaining = QUESTION_TEXT_MAX_LENGTH - characterCount(value.text);
	const showHint = hint && value.text.trim() === "";

	const editor = useEditor({
		...STATEMENT_EDITOR_OPTIONS,
		extensions: statementExtensions(),
		content: statementToDocument(initialText ?? "", initialFormatting),
		// Built in the browser only: the server draws the formatted text below.
		immediatelyRender: false,
		editorProps: {
			attributes: {
				role: "textbox",
				"aria-label": "Pergunta",
				"aria-multiline": "false",
				"aria-placeholder": STATEMENT_PLACEHOLDER,
				// Ids of hints that are not shown are ignored.
				"aria-describedby": `${hintId} ${tipId}`,
				class: FIELD_CLASSES,
			},
		},
		onUpdate: ({ editor: changed }) => {
			setValue(documentToStatement(changed.getJSON()));
		},
	});

	// Lit where the cursor is, or for what is typed next (RN-05).
	const active =
		useEditorState({
			editor,
			selector: ({ editor: current }) =>
				current
					? (Object.fromEntries(
							TEXT_MARKS.map((mark) => [mark, current.isActive(mark)]),
						) as Record<TextMark, boolean>)
					: NOTHING_ACTIVE,
		}) ?? NOTHING_ACTIVE;

	const toggle = (mark: TextMark) => {
		editor?.chain().focus().toggleMark(mark).run();
	};

	// In place of the selection, with the marks of where it goes (RN-12);
	// refused by the limit when it does not fit (RN-14).
	const insertSymbol = (symbol: string) => {
		editor
			?.chain()
			.focus()
			.command(({ tr }) => {
				tr.insertText(symbol);
				return true;
			})
			.run();
	};

	const onBlur = (event: FocusEvent<HTMLFieldSetElement>) => {
		if (event.currentTarget.contains(event.relatedTarget)) {
			return;
		}
		setFocused(false);
		void flush();
	};

	return (
		<div className="relative mt-12 flex w-full min-w-0 flex-1 flex-col">
			{/* The field and its bar: the bar shows while either has the focus. */}
			<fieldset
				aria-label="Enunciado"
				className="relative m-0 w-full min-w-0 border-0 p-0"
				onFocus={() => setFocused(true)}
				onBlur={onBlur}
			>
				{focused && (
					<FormattingToolbar
						active={active}
						onToggle={toggle}
						onSymbols={() => setSymbolsOpen(true)}
						className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2"
					/>
				)}
				{editor ? (
					<EditorContent editor={editor} />
				) : (
					<div aria-hidden="true" className={FIELD_CLASSES}>
						<FormattedText text={value.text} formatting={value.formatting} />
					</div>
				)}
				{focused && (
					<span className="pointer-events-none absolute top-1.5 right-2.5 font-semibold text-muted-foreground text-xs">
						<span aria-hidden="true">{remaining}</span>
						<span className="sr-only">{`${remaining} caracteres restantes`}</span>
					</span>
				)}
			</fieldset>
			{tip && focused && (
				<p
					id={tipId}
					className="absolute top-full left-1/2 z-10 mt-1.5 w-max max-w-sm -translate-x-1/2 rounded-md bg-foreground px-3 py-2 font-semibold text-background text-xs shadow-md"
				>
					{tip}
				</p>
			)}
			{showHint && (
				<EditorHint id={hintId}>{MISSING_QUESTION_TEXT_HINT}</EditorHint>
			)}
			<SymbolDialog
				open={symbolsOpen}
				onOpenChange={(open) => {
					setSymbolsOpen(open);
					if (!open) {
						// Back to the cursor and the selection of before (RN-13).
						editor?.commands.focus();
					}
				}}
				onPick={insertSymbol}
			/>
		</div>
	);
}
