import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import type { PlayerQuestionData } from "@/lib/api-types";
import { answerShapeName } from "@/lib/game-stage";

type PlayerChoice = PlayerQuestionData["choices"][number];

/**
 * The player's answers: one button per filled answer, with its color and
 * shape (spec 009, RN-14). With the questions on the devices each one also
 * carries its text, the shape small in the corner (spec 012, RN-18b). In
 * single selection and true/false a tap is the answer; in multiple selection
 * a tap marks, and "Enviar" sends what is marked (RN-28 to RN-31). What is
 * marked lives here: it goes away with the question.
 */
export function AnswerButtons({
	question,
	onAnswer,
}: {
	question: PlayerQuestionData;
	onAnswer: (choiceIds: string[]) => void;
}) {
	const [marked, setMarked] = useState<readonly string[]>([]);
	const multiple = question.selection === "multiple";
	const withTexts = question.choices.some((choice) => choice.text !== null);

	function tap(choice: PlayerChoice) {
		if (!multiple) {
			onAnswer([choice.id]);
			return;
		}
		setMarked((current) =>
			current.includes(choice.id)
				? current.filter((id) => id !== choice.id)
				: [...current, choice.id],
		);
	}

	return (
		<div
			className={cn(
				"flex min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2",
				// Only shapes: the buttons are the screen. With the texts they
				// sit at the bottom, under the image and the statement, and keep
				// their size: the list scrolls only if the screen is too short.
				!withTexts && "flex-1",
			)}
		>
			{multiple && (
				<p className="shrink-0 rounded-md bg-black/40 px-3 py-2 text-center font-bold">
					Selecione uma ou mais respostas!
				</p>
			)}
			<fieldset
				aria-label="Respostas"
				className={cn(
					"grid grid-cols-2 gap-2",
					// With texts, cards of a good size for the thumb, as in Kahoot,
					// that grow with a long text (spec 012, RN-18b).
					withTexts
						? "shrink-0 auto-rows-[minmax(clamp(5.5rem,13svh,8.5rem),auto)]"
						: "min-h-0 flex-1 auto-rows-fr",
				)}
			>
				{question.choices.map((choice) => (
					<AnswerButton
						key={choice.id}
						choice={choice}
						marked={multiple ? marked.includes(choice.id) : null}
						onTap={() => tap(choice)}
					/>
				))}
			</fieldset>
			{multiple && (
				<Button
					variant="success"
					size="lg"
					className="shrink-0"
					disabled={marked.length === 0}
					onClick={() =>
						// In the order of the screen, whatever the order of the taps.
						onAnswer(
							question.choices
								.filter((choice) => marked.includes(choice.id))
								.map((choice) => choice.id),
						)
					}
				>
					Enviar
				</Button>
			)}
		</div>
	);
}

function AnswerButton({
	choice,
	marked,
	onTap,
}: {
	choice: PlayerChoice;
	/** Null where a tap is the answer: there is nothing to mark. */
	marked: boolean | null;
	onTap: () => void;
}) {
	const shape = answerShapeAt(choice.shapeIndex);
	const withText = choice.text !== null;

	return (
		<button
			type="button"
			data-slot="answer-button"
			data-shape={shape}
			data-format={withText ? "text" : "shape"}
			// With only color and shape, as in Kahoot, true/false buttons are named
			// for screen readers and the others by their shape. A text names itself.
			aria-label={
				withText
					? undefined
					: (choice.label ?? answerShapeName(choice.shapeIndex))
			}
			aria-pressed={marked ?? undefined}
			onClick={onTap}
			className={cn(
				"relative flex min-h-0 select-none flex-col items-center justify-center gap-2 rounded-md text-answer-foreground shadow-press outline-none transition-[filter,transform,box-shadow] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-white/70 active:translate-y-0.5 active:shadow-press-sm",
				ANSWER_COLOR_CLASSES[shape],
				withText && "px-3 py-8",
				marked && "ring-4 ring-white",
			)}
		>
			{withText ? (
				<>
					<AnswerShape
						data-slot="answer-button-shape"
						shape={shape}
						className="absolute top-2 left-2 size-5 drop-shadow-sm"
					/>
					<span
						data-slot="answer-button-text"
						className="w-full break-words text-center font-bold text-lg leading-tight sm:text-2xl"
					>
						{choice.text}
					</span>
				</>
			) : (
				<AnswerShape
					shape={shape}
					className="size-16 drop-shadow-sm sm:size-24"
				/>
			)}
			{marked !== null && (
				<span
					data-slot="answer-marker"
					data-marked={marked}
					aria-hidden="true"
					className={cn(
						"absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-[3px] border-answer-foreground",
						marked && "bg-answer-correct motion-safe:animate-pop-in",
					)}
				>
					{marked && <CheckIcon className="size-4 stroke-4" />}
				</span>
			)}
		</button>
	);
}
