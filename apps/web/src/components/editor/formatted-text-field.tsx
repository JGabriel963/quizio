import {
	TEXT_MARKS,
	type TextFormatting,
	type TextMark,
} from "@quizio/core/shared/domain/text-formatting";
import { cn } from "@quizio/ui/lib/utils";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { type FocusEvent, type ReactNode, useRef, useState } from "react";

import { FormattedText } from "@/components/quiz/formatted-text";
import {
	fromFormattedDocument,
	toFormattedDocument,
} from "@/lib/formatted-text-document";
import {
	FORMATTED_TEXT_EDITOR_OPTIONS,
	formattedTextExtensions,
} from "@/lib/formatted-text-extensions";

import { FormattingToolbar } from "./formatting-toolbar";
import { SymbolDialog } from "./symbol-dialog";

/** A text as a formatted field holds it: what is typed and its marked stretches. */
export interface FormattedValue {
	text: string;
	formatting: TextFormatting;
}

/** A formatted text as the editor saves it; a blank one is null, with none. */
export interface SavedText {
	text: string | null;
	formatting: TextFormatting;
}

const NOTHING_ACTIVE: Record<TextMark, boolean> = {
	bold: false,
	italic: false,
	subscript: false,
	superscript: false,
};

/** Draws the placeholder over the empty paragraph, as the editor marks it. */
const PLACEHOLDER_CLASSES =
	"[&_p.is-editor-empty]:relative [&_p.is-editor-empty]:before:pointer-events-none [&_p.is-editor-empty]:before:absolute [&_p.is-editor-empty]:before:inset-x-0 [&_p.is-editor-empty]:before:text-muted-foreground [&_p.is-editor-empty]:before:content-[attr(data-placeholder)]";

/**
 * A one-line text with bold, italic, subscript and superscript (spec 047;
 * spec 048): the statement and the answers use it. While the field or its bar
 * has the focus, the formatting bar floats by it (RN-01) — above unless
 * `toolbarClassName` places it — and Ω opens "Insira um símbolo", whose symbol
 * goes into this field (RN-09, RN-10). Each field has its own editor, so its
 * own undo (RN-03). The limit is the core's, counting the text only.
 */
export function FormattedTextField({
	initialValue,
	maxLength,
	placeholder,
	label,
	groupLabel,
	describedBy,
	toolbarLabel,
	toolbarClassName,
	fieldClassName,
	className,
	onChange,
	onFocusChange,
	onBlur,
	onImage,
	children,
}: {
	initialValue: FormattedValue;
	maxLength: number;
	/** A function is read again on every draw (a puzzle's optional slot). */
	placeholder: string | (() => string);
	/** The textbox's name. */
	label: string;
	/** The name of the field and its bar together, when they need one. */
	groupLabel?: string;
	describedBy?: string;
	toolbarLabel: string;
	toolbarClassName?: string;
	/** The editable box's classes. */
	fieldClassName?: string;
	className?: string;
	onChange: (value: FormattedValue) => void;
	onFocusChange?: (focused: boolean) => void;
	/** The focus left the field and its bar. */
	onBlur?: () => void;
	/** An answer's bar starts with the image (spec 049, RN-05). */
	onImage?: () => void;
	/** Drawn inside the field's group, such as the characters left. */
	children?: ReactNode;
}) {
	const [focused, setFocused] = useState(false);
	const [symbolsOpen, setSymbolsOpen] = useState(false);
	// Read by the blur that opening the dialog causes, before a render.
	const symbolsOpenRef = useRef(false);
	const openSymbols = (open: boolean) => {
		symbolsOpenRef.current = open;
		setSymbolsOpen(open);
	};
	const placeholderNow =
		typeof placeholder === "function" ? placeholder() : placeholder;

	const editor = useEditor({
		...FORMATTED_TEXT_EDITOR_OPTIONS,
		extensions: formattedTextExtensions({ maxLength, placeholder }),
		content: toFormattedDocument(initialValue.text, initialValue.formatting),
		// Built in the browser only: the server draws the formatted text below.
		immediatelyRender: false,
		editorProps: {
			attributes: {
				role: "textbox",
				"aria-label": label,
				"aria-multiline": "false",
				"aria-placeholder": placeholderNow,
				...(describedBy ? { "aria-describedby": describedBy } : {}),
				class: cn(PLACEHOLDER_CLASSES, fieldClassName),
			},
		},
		onUpdate: ({ editor: changed }) => {
			onChange(fromFormattedDocument(changed.getJSON()));
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

	const changeFocus = (now: boolean) => {
		setFocused(now);
		onFocusChange?.(now);
	};

	const leave = (event: FocusEvent<HTMLFieldSetElement>) => {
		// The symbols dialog is part of the edit: the field keeps its focus
		// state (and its place, on a phone) until the dialog gives it back.
		if (
			event.currentTarget.contains(event.relatedTarget) ||
			symbolsOpenRef.current
		) {
			return;
		}
		changeFocus(false);
		onBlur?.();
	};

	return (
		<>
			{/* The field and its bar: the bar shows while either has the focus. */}
			<fieldset
				aria-label={groupLabel}
				className={cn("relative m-0 min-w-0 border-0 p-0", className)}
				onFocus={() => changeFocus(true)}
				onBlur={leave}
			>
				{focused && (
					<FormattingToolbar
						label={toolbarLabel}
						active={active}
						onToggle={toggle}
						onSymbols={() => openSymbols(true)}
						onImage={onImage}
						className={cn(
							"absolute left-1/2 z-20 -translate-x-1/2",
							toolbarClassName ?? "bottom-full mb-2",
						)}
					/>
				)}
				{editor ? (
					<EditorContent editor={editor} />
				) : (
					<div aria-hidden="true" className={fieldClassName}>
						<FormattedText
							text={initialValue.text}
							formatting={initialValue.formatting}
						/>
					</div>
				)}
				{children}
			</fieldset>
			<SymbolDialog
				open={symbolsOpen}
				onOpenChange={(open) => {
					openSymbols(open);
					if (!open) {
						// Back to the cursor and the selection of before (RN-13).
						editor?.commands.focus();
					}
				}}
				onPick={insertSymbol}
			/>
		</>
	);
}
