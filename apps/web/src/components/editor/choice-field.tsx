import {
	CHOICE_TEXT_MAX_LENGTH,
	type Choice,
} from "@quizio/core/quiz/domain/question";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { useId, useState } from "react";

import { answerPlaceholder, missingAnswerHint } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { AnswerTextInput } from "./answer-text-input";
import { EditorHint } from "./editor-hint";

/**
 * One answer block (spec 004): color and shape of its position, the autosaved
 * text capped at 75 characters and the "correct" mark, which an empty answer
 * cannot have (RN-04, RN-06). The text wraps and the block grows to show all
 * of it; while it has the focus, the corner counts what is left (as Kahoot).
 */
export function ChoiceField({
	questionId,
	choice,
	index,
	hint,
	onSaveText,
	onCorrectChange,
}: {
	questionId: string;
	choice: Choice;
	index: number;
	/** Shows "A resposta N não foi adicionada" while the field is empty (RN-16). */
	hint: boolean;
	onSaveText: (text: string | null) => Promise<unknown>;
	onCorrectChange: (correct: boolean) => void;
}) {
	const position = index + 1;
	const shape = answerShapeAt(index);
	const hintId = useId();
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:choice:${choice.id}`,
		initialValue: choice.text ?? "",
		save: (text: string) => onSaveText(text.trim() === "" ? null : text),
	});
	const filled = value.trim() !== "";
	const showHint = hint && !filled;
	const left = CHOICE_TEXT_MAX_LENGTH - characterCount(value);

	return (
		<li className="relative flex flex-col">
			<div
				className={cn(
					"relative flex min-h-16 flex-1 items-center @4xl:gap-4 gap-3 rounded-md p-2 shadow-press-light transition-colors sm:min-h-[clamp(4.5rem,11svh,7rem)]",
					filled
						? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
						: "bg-card",
				)}
			>
				<span
					className={cn(
						"flex min-h-12 @4xl:w-12 w-10 shrink-0 items-center justify-center self-stretch rounded-md text-answer-foreground",
						ANSWER_COLOR_CLASSES[shape],
					)}
				>
					<AnswerShape shape={shape} className="@4xl:size-7 size-5" />
				</span>
				<AnswerTextInput
					aria-label={`Resposta ${position}`}
					aria-describedby={showHint ? hintId : undefined}
					placeholder={answerPlaceholder(index)}
					value={value}
					onFocus={() => setFocused(true)}
					onValueChange={(typed) =>
						setValue(truncateCharacters(typed, CHOICE_TEXT_MAX_LENGTH))
					}
					onBlur={() => {
						setFocused(false);
						void flush();
					}}
					className="font-bold @4xl:text-lg"
				/>
				{focused && (
					<span className="pointer-events-none absolute top-1 right-2 font-bold text-xs">
						<span aria-hidden="true">{left}</span>
						<span className="sr-only">{left} caracteres restantes</span>
					</span>
				)}
				<Checkbox
					variant="answer"
					aria-label={`Resposta ${position} correta`}
					checked={choice.correct}
					disabled={!filled}
					onCheckedChange={async (checked) => {
						// The answer must reach the server before it can be correct.
						await flush();
						onCorrectChange(checked);
					}}
					className={cn("@4xl:mr-1 @4xl:size-11", !filled && "invisible")}
				/>
			</div>
			{showHint && (
				<EditorHint id={hintId}>{missingAnswerHint(position)}</EditorHint>
			)}
		</li>
	);
}
