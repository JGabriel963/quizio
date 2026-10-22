import { QUESTION_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Input } from "@quizio/ui/components/input";
import { useId, useState } from "react";

import { MISSING_QUESTION_TEXT_HINT } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { EditorHint } from "./editor-hint";

/**
 * Question text, autosaved and capped at the core's limit (spec 003, RN-10).
 * The characters left show in the corner while the field is focused, as in Kahoot.
 */
export function QuestionTextField({
	questionId,
	initialText,
	hint,
	tip,
	onSave,
}: {
	questionId: string;
	initialText: string | null;
	/** Shows "Nenhuma pergunta foi adicionada." while the field is empty. */
	hint: boolean;
	/** What to write, shown below while the field is edited (spec 033, RN-06). */
	tip?: string;
	onSave: (text: string | null) => Promise<unknown>;
}) {
	const hintId = useId();
	const tipId = useId();
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:text`,
		initialValue: initialText ?? "",
		save: (text: string) => onSave(text.trim() === "" ? null : text),
	});
	const count = characterCount(value);
	const remaining = QUESTION_TEXT_MAX_LENGTH - count;

	const showHint = hint && value.trim() === "";

	return (
		<div className="relative flex w-full min-w-0 flex-1 flex-col">
			<div className="relative w-full">
				<Input
					aria-label="Pergunta"
					aria-describedby={
						[showHint && hintId, tip && focused && tipId]
							.filter(Boolean)
							.join(" ") || undefined
					}
					placeholder="Comece a digitar a pergunta"
					value={value}
					onChange={(event) =>
						setValue(
							truncateCharacters(event.target.value, QUESTION_TEXT_MAX_LENGTH),
						)
					}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						setFocused(false);
						void flush();
					}}
					className="h-auto rounded-md border-0 bg-card px-4 py-4 text-center font-bold text-lg shadow-press-light sm:px-12 sm:text-2xl xl:py-5 xl:text-3xl"
				/>
				{focused && (
					<span className="pointer-events-none absolute top-1.5 right-2.5 font-semibold text-muted-foreground text-xs">
						<span aria-hidden="true">{remaining}</span>
						<span className="sr-only">{`${remaining} caracteres restantes`}</span>
					</span>
				)}
			</div>
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
		</div>
	);
}
