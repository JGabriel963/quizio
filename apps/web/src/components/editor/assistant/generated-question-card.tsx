import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	type AnswerShapeName,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useId } from "react";

import type { GeneratedQuestionData } from "@/lib/api-types";
import type { AssistantLayout } from "@/lib/assistant-state";

import { TRUE_FALSE_ANSWERS } from "../true-false-answers";

interface CardAnswer {
	key: string;
	text: string;
	shape: AnswerShapeName;
	correct: boolean;
}

function answersOf(question: GeneratedQuestionData): CardAnswer[] {
	if (question.type === "trueFalse") {
		return TRUE_FALSE_ANSWERS.map(({ label, value, shape }) => ({
			key: label,
			text: label,
			shape,
			correct: question.correct === value,
		}));
	}
	return question.choices.flatMap((choice, index) =>
		choice.text === null
			? []
			: [
					{
						key: choice.id,
						text: choice.text,
						shape: answerShapeAt(index),
						correct: choice.correct,
					},
				],
	);
}

/**
 * One created question as Kahoot's assistant shows it (spec 027, RN-24): the
 * statement with its mark, and the answers in their colors and shapes with
 * the right one checked.
 */
export function GeneratedQuestionCard({
	question,
	checked,
	layout,
	onToggle,
}: {
	question: GeneratedQuestionData;
	checked: boolean;
	layout: AssistantLayout;
	onToggle: () => void;
}) {
	const textId = useId();
	const compact = layout === "list";

	return (
		<li
			aria-labelledby={textId}
			className={cn(
				"relative flex rounded-lg border-2 bg-card p-2 shadow-sm transition-colors",
				checked ? "border-primary" : "border-transparent",
				compact ? "flex-row items-center gap-3" : "flex-col gap-2",
			)}
		>
			<div
				className={cn(
					"flex items-start gap-2 rounded-md bg-muted p-2",
					compact ? "min-w-0 flex-1" : "min-h-16",
				)}
			>
				<p
					id={textId}
					className="min-w-0 flex-1 text-center font-bold text-sm leading-snug"
				>
					{question.text}
				</p>
				<Checkbox
					aria-label={question.text ?? "Pergunta"}
					checked={checked}
					onCheckedChange={onToggle}
					className="size-6 [&_[data-slot=checkbox-indicator]>svg]:size-4"
				/>
			</div>
			<ul
				aria-label="Respostas"
				className={cn(
					"grid gap-1",
					compact ? "w-72 shrink-0 grid-cols-2 max-sm:hidden" : "grid-cols-2",
				)}
			>
				{answersOf(question).map((answer) => (
					<li
						key={answer.key}
						data-correct={answer.correct}
						className={cn(
							"flex min-h-7 items-center gap-1.5 rounded-sm px-2 py-1 font-semibold text-answer-foreground text-xs",
							ANSWER_COLOR_CLASSES[answer.shape],
						)}
					>
						<AnswerShape shape={answer.shape} className="size-3 shrink-0" />
						<span
							aria-hidden={answer.correct || undefined}
							className="min-w-0 flex-1"
						>
							{answer.text}
						</span>
						{answer.correct && (
							<>
								<CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
								<span className="sr-only">{`${answer.text} (correta)`}</span>
							</>
						)}
					</li>
				))}
			</ul>
		</li>
	);
}
