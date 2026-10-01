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
	QUESTION_ISSUE_LABELS,
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
							"flex min-h-16 items-center gap-3 rounded-md p-2 text-answer-foreground shadow-press-light sm:min-h-20",
							ANSWER_COLOR_CLASSES[shape],
						)}
					>
						<span className="flex h-full min-h-12 w-10 shrink-0 items-center justify-center">
							<AnswerShape shape={shape} className="size-5" />
						</span>
						<span className="min-w-0 flex-1 font-bold">{label}</span>
						<Checkbox
							variant="answer"
							aria-label={`${label} correta`}
							checked={correct === value}
							onCheckedChange={() =>
								onCorrectChange(toggledTrueFalseCorrect(correct, value))
							}
						/>
					</li>
				))}
			</ul>
			{unanswered && (
				<EditorHint id={hintId}>
					{QUESTION_ISSUE_LABELS.noCorrectTrueFalse}
				</EditorHint>
			)}
		</div>
	);
}
