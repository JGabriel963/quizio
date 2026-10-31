import type { Question } from "@quizio/core/quiz/domain/question";
import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon } from "lucide-react";

import {
	AnswerImage,
	type AnswerImageShown,
	answerImageLabel,
	answerImageShown,
} from "@/components/quiz/answer-image";
import { FormattedText } from "@/components/quiz/formatted-text";
import { timeLimitLabel } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { formatSliderNumber } from "@/lib/slider-format";

/**
 * "Perguntas (N)" of a shared quiz (spec 037, RN-16): each question's number,
 * type, time, text and image; the answers, with the right ones marked, only
 * with "Mostrar respostas".
 */
export function SharedQuestionList({
	questions,
	imageUrls,
	showAnswers,
}: {
	questions: readonly Question[];
	imageUrls: Readonly<Record<string, string>>;
	showAnswers: boolean;
}) {
	return (
		<ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{questions.map((question, index) => {
				const imageUrl = question.image
					? imageUrls[question.image.key]
					: undefined;
				return (
					<li
						key={question.id}
						className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm"
					>
						<p className="text-muted-foreground text-xs">
							{index + 1} · {questionTypeLabel(question.type)} ·{" "}
							{timeLimitLabel(question.timeLimitSeconds)}
						</p>
						<p>
							{question.text && (
								<FormattedText
									text={question.text}
									formatting={question.textFormatting}
								/>
							)}
						</p>
						{imageUrl && (
							<img
								src={imageUrl}
								alt={question.image?.altText ?? ""}
								className="max-h-48 w-full rounded-md bg-muted object-contain"
							/>
						)}
						{showAnswers && (
							<QuestionAnswers question={question} imageUrls={imageUrls} />
						)}
					</li>
				);
			})}
		</ol>
	);
}

/**
 * An answer drawn with its color and shape, its text formatted in normal
 * weight (spec 048, RN-18), and the mark when it is right.
 */
function AnswerLine({
	index,
	prefix,
	text,
	formatting,
	image = null,
	correct,
}: {
	index: number;
	/** A puzzle answer's place ("1. "). */
	prefix?: string;
	text: string | null;
	formatting?: TextFormatting;
	/** A thumbnail in place of the text (spec 049, RN-24). */
	image?: AnswerImageShown | null;
	correct: boolean;
}) {
	const shape = answerShapeAt(index);
	return (
		<li
			className={cn(
				"flex items-center gap-2 rounded-md px-3 py-2 font-bold text-answer-foreground text-sm",
				ANSWER_COLOR_CLASSES[shape],
			)}
		>
			<AnswerShape shape={shape} className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 break-words">
				{prefix && <span className="font-normal">{prefix}</span>}
				{image ? (
					<span className="inline-flex size-10 align-middle">
						<AnswerImage image={image} label={answerImageLabel(index)} />
					</span>
				) : (
					<FormattedText text={text ?? ""} formatting={formatting} />
				)}
			</span>
			{correct && (
				<>
					<CheckIcon aria-hidden="true" className="size-4 shrink-0 stroke-3" />
					<span className="sr-only">(correta)</span>
				</>
			)}
		</li>
	);
}

function QuestionAnswers({
	question,
	imageUrls,
}: {
	question: Question;
	imageUrls: Readonly<Record<string, string>>;
}) {
	switch (question.type) {
		case "quiz":
			return (
				<ul aria-label="Respostas" className="grid grid-cols-2 gap-2">
					{question.choices.map((choice, index) =>
						choice.text === null && choice.image === null ? null : (
							<AnswerLine
								key={choice.id}
								index={index}
								text={choice.text}
								formatting={choice.textFormatting}
								image={answerImageShown(choice.image, imageUrls)}
								correct={choice.correct}
							/>
						),
					)}
				</ul>
			);
		case "trueFalse":
			return (
				<ul aria-label="Respostas" className="grid grid-cols-2 gap-2">
					<AnswerLine
						index={1}
						text="Verdadeiro"
						correct={question.correct === true}
					/>
					<AnswerLine
						index={0}
						text="Falso"
						correct={question.correct === false}
					/>
				</ul>
			);
		case "typeAnswer":
			return (
				<ul aria-label="Respostas aceitas" className="flex flex-wrap gap-2">
					{question.acceptedAnswers.map((answer, index) =>
						answer === null ? null : (
							<li
								// The accepted answers have no id; their place is theirs.
								key={index}
								className="rounded-md bg-success px-3 py-1 font-bold text-sm text-success-foreground"
							>
								{answer}
							</li>
						),
					)}
				</ul>
			);
		case "slider": {
			const unit = question.unit ? ` ${question.unit}` : "";
			return question.answer === null ? null : (
				<p className="text-sm">
					Resposta:{" "}
					<span className="font-bold">
						{formatSliderNumber(question.answer)}
						{unit}
					</span>
					{question.min !== null && question.max !== null && (
						<span className="text-muted-foreground">
							{" "}
							(de {formatSliderNumber(question.min)} a{" "}
							{formatSliderNumber(question.max)})
						</span>
					)}
				</p>
			);
		}
		case "puzzle":
			return (
				<ol aria-label="Ordem certa" className="flex flex-col gap-2">
					{question.items.map((item, index) =>
						item === null && !question.itemImages[index] ? null : (
							<AnswerLine
								// Slots have no id: the place is the slot (spec 033).
								key={index}
								index={index}
								prefix={`${index + 1}. `}
								text={item}
								formatting={question.itemFormatting[index]}
								image={answerImageShown(question.itemImages[index], imageUrls)}
								correct={false}
							/>
						),
					)}
				</ol>
			);
	}
}
