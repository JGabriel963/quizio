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
	onSave,
}: {
	questionId: string;
	initialText: string | null;
	/** Shows "Nenhuma pergunta foi adicionada." while the field is empty. */
	hint: boolean;
	onSave: (text: string | null) => Promise<unknown>;
}) {
	const hintId = useId();
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
		<div className="flex w-full flex-col">
			<div className="relative w-full">
				<Input
					aria-label="Pergunta"
					aria-describedby={showHint ? hintId : undefined}
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
					className="h-auto rounded-md border-0 bg-card px-4 py-4 text-center font-bold text-lg shadow-press-light sm:px-12 sm:text-2xl"
				/>
				{focused && (
					<span className="pointer-events-none absolute top-1.5 right-2.5 font-semibold text-muted-foreground text-xs">
						<span aria-hidden="true">{remaining}</span>
						<span className="sr-only">{`${remaining} caracteres restantes`}</span>
					</span>
				)}
			</div>
			{showHint && (
				<EditorHint id={hintId} className="-mt-1.5">
					{MISSING_QUESTION_TEXT_HINT}
				</EditorHint>
			)}
		</div>
	);
}
