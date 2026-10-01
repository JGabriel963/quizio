import { toggledTrueFalseCorrect } from "@quizio/core/quiz/domain/question";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	type AnswerShapeName,
} from "@quizio/ui/components/answer-shape";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { useId } from "react";

import {
	NO_CORRECT_TRUE_FALSE_HINT,
	TRUE_FALSE_LABELS,
} from "@/lib/question-labels";

import { EditorHint } from "./editor-hint";

/** "Verdadeiro" is the blue diamond and "Falso" the red triangle, in this order (spec 005, RN-06). */
export const TRUE_FALSE_ANSWERS: readonly {
	value: boolean;
	label: string;
	shape: AnswerShapeName;
}[] = [
	{ value: true, label: TRUE_FALSE_LABELS.true, shape: "diamond" },
	{ value: false, label: TRUE_FALSE_LABELS.false, shape: "triangle" },
];

/**
 * The two fixed answers of a true/false question (spec 005): only the correct
 * one is chosen, and once chosen there is always one (RN-07).
 */
export function TrueFalseAnswers({
	correct,
	showHint,
	onCorrectChange,
}: {
	correct: boolean | null;
	/** Whether to point out that no answer is marked (spec 004, RN-16). */
	showHint: boolean;
	onCorrectChange: (correct: boolean) => void;
}) {
	const hintId = useId();
	const unanswered = showHint && correct === null;

	return (
		<div className="flex flex-col gap-2">
			<ul
				aria-label="Respostas"
				aria-describedby={unanswered ? hintId : undefined}
				className="grid grid-cols-1 gap-2 sm:grid-cols-2"
			>
				{TRUE_FALSE_ANSWERS.map(({ value, label, shape }) => (
					<li
						key={label}
						className={cn(
							"flex min-h-20 items-center gap-3 rounded-md p-2 text-answer-foreground shadow-press-light sm:min-h-[clamp(6rem,20svh,12.5rem)] xl:gap-4",
							ANSWER_COLOR_CLASSES[shape],
						)}
					>
						<span className="flex min-h-12 w-10 shrink-0 items-center justify-center xl:w-12">
							<AnswerShape shape={shape} className="size-5 xl:size-7" />
						</span>
						<span className="min-w-0 flex-1 font-bold xl:text-lg">{label}</span>
						<Checkbox
							variant="answer"
							aria-label={`${label} correta`}
							className="xl:mr-1 xl:size-11"
							checked={correct === value}
							onCheckedChange={() =>
								onCorrectChange(toggledTrueFalseCorrect(correct, value))
							}
						/>
					</li>
				))}
			</ul>
			{unanswered && (
				<EditorHint id={hintId}>{NO_CORRECT_TRUE_FALSE_HINT}</EditorHint>
			)}
		</div>
	);
}
