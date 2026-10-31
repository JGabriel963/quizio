import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { questionIssues } from "@quizio/core/quiz/domain/question-issues";

import type { ReactNode } from "react";

import type { QuestionData } from "@/lib/api-types";
import type { AnswerImageActions } from "./answer-image-field";
import type { SavedText } from "./formatted-text-field";
import { PuzzleAnswers } from "./puzzle-answers";
import { type ImageUploadState, QuestionMedia } from "./question-media";
import { QuestionTextField, type Statement } from "./question-text-field";
import { QuizAnswers } from "./quiz-answers";
import { SliderAnswers } from "./slider-answers";
import { TrueFalseAnswers } from "./true-false-answers";
import { TypeAnswerAnswers } from "./type-answer-answers";

/** Below a puzzle's question while it is edited (spec 033, RN-06). */
const PUZZLE_QUESTION_TIP =
	'Adicione a ordem esperada para ajudar os participantes a responder corretamente (por exemplo, "do menor ao maior").';

/** The selected question in the middle of the editor (specs 003 to 005, 007). */
export function QuestionCanvas({
	question,
	imageUrl,
	upload,
	showHints,
	onSaveStatement,
	onSaveChoiceText,
	onSaveAcceptedAnswer,
	onSavePuzzleItem,
	onChange,
	onUploadImage,
	answerImages,
	titleAside,
}: {
	question: QuestionData;
	/** Public URL of the question's image, if it has one. */
	imageUrl: string | null;
	upload: ImageUploadState;
	/** False for a question the creator has just started: no warnings yet (spec 004, RN-16). */
	showHints: boolean;
	/** The statement with its formatting (spec 047). */
	onSaveStatement: (statement: Statement) => Promise<unknown>;
	/** An answer with its formatting (spec 048). */
	onSaveChoiceText: (choiceId: string, answer: SavedText) => Promise<unknown>;
	/** The autosaved text of an accepted answer of a type answer (spec 031). */
	onSaveAcceptedAnswer: (
		index: number,
		text: string | null,
	) => Promise<unknown>;
	/** The autosaved text of a puzzle's slot, with its formatting (specs 033, 048). */
	onSavePuzzleItem: (index: number, item: SavedText) => Promise<unknown>;
	/** Changes saved at once: corrects and the extra answers. */
	onChange: (change: QuestionChange) => void;
	onUploadImage: (file: File) => void;
	/** Images in the quiz and puzzle answers (spec 049). */
	answerImages?: AnswerImageActions;
	/** Beside the question text: the properties menu on compact screens. */
	titleAside?: ReactNode;
}) {
	return (
		// As in Kahoot, the question takes the whole middle of the editor: the
		// text and the answers span its width, and the media gets the height left.
		<div className="flex min-h-full w-full flex-col gap-3 sm:gap-4">
			<div className="flex items-center gap-2">
				{/* Keyed by question so switching questions never mixes their texts. */}
				<QuestionTextField
					key={question.id}
					questionId={question.id}
					initialText={question.text}
					initialFormatting={question.textFormatting}
					hint={showHints}
					tip={question.type === "puzzle" ? PUZZLE_QUESTION_TIP : undefined}
					onSave={onSaveStatement}
				/>
				{titleAside}
			</div>

			{/*
				The media gets the height the text and the answers leave. Its box is the
				largest 3:2 that fits, measured with container units; the container is
				positioned so its height is known (a flex item's is not, to those units).
			*/}
			<div className="relative min-h-56 flex-1">
				<div
					data-slot="question-media-space"
					className="absolute inset-0 flex items-center justify-center [container-type:size]"
				>
					{/* Keyed by question: its dialogs never follow the selection. */}
					<QuestionMedia
						key={`media:${question.id}`}
						image={question.image}
						url={imageUrl}
						upload={upload}
						onUpload={onUploadImage}
						onChange={onChange}
					/>
				</div>
			</div>

			{question.type === "quiz" && (
				<QuizAnswers
					question={question}
					showHints={showHints}
					onSaveChoiceText={onSaveChoiceText}
					onChange={onChange}
					answerImages={answerImages}
				/>
			)}
			{question.type === "trueFalse" && (
				<TrueFalseAnswers
					correct={question.correct}
					showHint={showHints}
					onCorrectChange={(correct) =>
						onChange({ kind: "trueFalseCorrect", correct })
					}
				/>
			)}
			{question.type === "typeAnswer" && (
				<TypeAnswerAnswers
					key={question.id}
					questionId={question.id}
					acceptedAnswers={question.acceptedAnswers}
					hint={
						showHints && questionIssues(question).includes("noAcceptedAnswer")
					}
					onSaveAnswer={onSaveAcceptedAnswer}
					onChange={onChange}
				/>
			)}
			{question.type === "slider" && (
				<SliderAnswers
					key={question.id}
					question={question}
					onChange={onChange}
				/>
			)}
			{question.type === "puzzle" && (
				<PuzzleAnswers
					key={question.id}
					question={question}
					onSaveItem={onSavePuzzleItem}
					onChange={onChange}
					answerImages={answerImages}
				/>
			)}
		</div>
	);
}
