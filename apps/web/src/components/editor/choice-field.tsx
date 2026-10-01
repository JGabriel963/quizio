import {
	CHOICE_TEXT_MAX_LENGTH,
	type Choice,
} from "@quizio/core/quiz/domain/question";
import { truncateCharacters } from "@quizio/core/shared/domain/text-length";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { useId } from "react";

import { answerPlaceholder, missingAnswerHint } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { EditorHint } from "./editor-hint";

/**
 * One answer block (spec 004): color and shape of its position, the autosaved
 * text capped at 75 characters and the "correct" mark, which an empty answer
 * cannot have (RN-04, RN-06).
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
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:choice:${choice.id}`,
		initialValue: choice.text ?? "",
		save: (text: string) => onSaveText(text.trim() === "" ? null : text),
	});
	const filled = value.trim() !== "";
	const showHint = hint && !filled;

	return (
		<li className="flex flex-col gap-1">
			<div
				className={cn(
					"flex min-h-16 items-center gap-3 rounded-md p-2 shadow-press-light transition-colors sm:min-h-[clamp(4.5rem,11svh,7rem)] xl:gap-4",
					filled
						? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
						: "bg-card",
				)}
			>
				<span
					className={cn(
						"flex min-h-12 w-10 shrink-0 items-center justify-center self-stretch rounded-md text-answer-foreground xl:w-12",
						ANSWER_COLOR_CLASSES[shape],
					)}
				>
					<AnswerShape shape={shape} className="size-5 xl:size-7" />
				</span>
				<input
					aria-label={`Resposta ${position}`}
					aria-describedby={showHint ? hintId : undefined}
					placeholder={answerPlaceholder(index)}
					value={value}
					onChange={(event) =>
						setValue(
							truncateCharacters(event.target.value, CHOICE_TEXT_MAX_LENGTH),
						)
					}
					onBlur={() => void flush()}
					className={cn(
						"min-w-0 flex-1 bg-transparent font-bold outline-none xl:text-lg",
						filled
							? "placeholder:text-answer-foreground/70"
							: "placeholder:text-muted-foreground",
					)}
				/>
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
					className={cn("xl:mr-1 xl:size-11", !filled && "invisible")}
				/>
			</div>
			{showHint && (
				<EditorHint id={hintId} className="-mt-2.5">
					{missingAnswerHint(position)}
				</EditorHint>
			)}
		</li>
	);
}
