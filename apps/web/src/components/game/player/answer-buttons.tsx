import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";

import type { PlayerQuestionData } from "@/lib/api-types";
import { answerShapeName } from "@/lib/game-stage";

/**
 * The player's answers: one button per filled answer, with its color and
 * shape and no text (spec 009, RN-14). A tap is the answer, whatever the
 * question (RN-15, RN-16): how a multiple-selection question is answered is
 * still to be decided, so for now it also takes one tap.
 */
export function AnswerButtons({
	question,
	onAnswer,
}: {
	question: PlayerQuestionData;
	onAnswer: (choiceIds: string[]) => void;
}) {
	return (
		<fieldset
			aria-label="Respostas"
			className="m-2 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2"
		>
			{question.choices.map((choice) => {
				const shape = answerShapeAt(choice.shapeIndex);
				return (
					<button
						key={choice.id}
						type="button"
						data-slot="answer-button"
						data-shape={shape}
						// Only color and shape show, as in Kahoot; true/false buttons are
						// named for screen readers, the others by their shape.
						aria-label={choice.label ?? answerShapeName(choice.shapeIndex)}
						onClick={() => onAnswer([choice.id])}
						className={cn(
							"flex min-h-0 select-none flex-col items-center justify-center gap-2 rounded-md text-answer-foreground shadow-press outline-none transition-[filter,transform,box-shadow] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-white/70 active:translate-y-0.5 active:shadow-press-sm",
							ANSWER_COLOR_CLASSES[shape],
						)}
					>
						<AnswerShape
							shape={shape}
							className="size-16 drop-shadow-sm sm:size-24"
						/>
					</button>
				);
			})}
		</fieldset>
	);
}
