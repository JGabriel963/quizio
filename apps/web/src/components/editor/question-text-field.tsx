import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import { cn } from "@quizio/ui/lib/utils";
import { useId, useState } from "react";

import { FormattedText } from "@/components/quiz/formatted-text";

import { MISSING_QUESTION_TEXT_HINT } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";
import { useTouchDevice } from "@/lib/use-touch-device";

import { EditorHint } from "./editor-hint";
import { FormattedTextField, type SavedText } from "./formatted-text-field";

export const STATEMENT_PLACEHOLDER = "Comece a digitar a pergunta";

/** The statement as the editor saves it: its text and the marked stretches. */
export type Statement = SavedText;

/**
 * The box of the statement. Grows with the text up to a few lines, then
 * scrolls; the text is centered, in normal weight so bold stands out (spec 047,
 * RN-24).
 */
const FIELD_CLASSES =
	"block max-h-36 min-h-0 overflow-y-auto rounded-md bg-card px-4 py-4 text-center font-normal text-lg leading-snug shadow-press-light outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-primary/25 sm:max-h-44 sm:px-12 sm:text-2xl xl:max-h-52 xl:py-5 xl:text-3xl";

/**
 * Question text with its formatting (spec 003, RN-10; spec 047), autosaved
 * and capped at the core's limit. While the statement or its bar has the
 * focus, the formatting bar floats above it (RN-01) and the characters left
 * show in the corner, counting the text only (RN-08). It is one sentence:
 * Enter adds no line, and a paste comes in one line, keeping only the four
 * marks (RN-07, RN-09). Ω opens "Insira um símbolo" (RN-11 to RN-14).
 *
 * On a phone or a tablet the field rises over a darkened screen while it is
 * edited, centered on it as in Kahoot; a
 * copy keeps its place in the canvas and a touch outside closes it. It is the
 * same editor moved by CSS, so nothing typed is lost on the way.
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
	const lifted = useTouchDevice() && focused;

	return (
		<div className="relative flex w-full min-w-0 flex-1 flex-col">
			{lifted && (
				<>
					<div aria-hidden="true" className={FIELD_CLASSES}>
						<FormattedText text={value.text} formatting={value.formatting} />
					</div>
					<div
						aria-hidden="true"
						data-slot="statement-backdrop"
						className="fade-in fixed inset-0 z-40 animate-in bg-black/60 duration-200"
						// The press keeps the focus, so the backdrop stays until the
						// click and takes it: closing on the press would unmount it
						// first and the click would land on what is under it.
						onPointerDown={(event) => event.preventDefault()}
						onClick={() => {
							if (document.activeElement instanceof HTMLElement) {
								document.activeElement.blur();
							}
						}}
					/>
				</>
			)}
			<FormattedTextField
				initialValue={{
					text: initialText ?? "",
					formatting: initialFormatting,
				}}
				maxLength={QUESTION_TEXT_MAX_LENGTH}
				placeholder={STATEMENT_PLACEHOLDER}
				label="Pergunta"
				groupLabel="Enunciado"
				// Ids of hints that are not shown are ignored.
				describedBy={`${hintId} ${tipId}`}
				toolbarLabel="Formatação do enunciado"
				// Below the field, over the media: the statement keeps its place at
				// the top of the canvas, beside the ⋮.
				toolbarClassName="top-full mt-2"
				fieldClassName={FIELD_CLASSES}
				className={cn(
					"w-full",
					lifted &&
						"fade-in slide-in-from-bottom-2 fixed inset-x-3 top-1/2 z-50 w-auto -translate-y-1/2 animate-in duration-200",
				)}
				onChange={setValue}
				onFocusChange={setFocused}
				onBlur={() => void flush()}
			>
				{focused && (
					<span className="pointer-events-none absolute top-1.5 right-2.5 font-semibold text-muted-foreground text-xs">
						<span aria-hidden="true">{remaining}</span>
						<span className="sr-only">{`${remaining} caracteres restantes`}</span>
					</span>
				)}
			</FormattedTextField>
			{tip && focused && !lifted && (
				<p
					id={tipId}
					className="absolute top-full left-1/2 z-10 mt-14 w-max max-w-sm -translate-x-1/2 rounded-md bg-foreground px-3 py-2 font-semibold text-background text-xs shadow-md"
				>
					{tip}
				</p>
			)}
			{showHint && (
				<EditorHint id={hintId}>{MISSING_QUESTION_TEXT_HINT}</EditorHint>
			)}
		</div>
	);
}
