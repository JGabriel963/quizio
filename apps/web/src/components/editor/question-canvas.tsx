import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";

import type { QuestionData } from "@/lib/api-types";

import { type ImageUploadState, QuestionMedia } from "./question-media";
import { QuestionTextField } from "./question-text-field";
import { QuizAnswers } from "./quiz-answers";
import { TrueFalseAnswers } from "./true-false-answers";

/** The selected question in the middle of the editor (specs 003 to 005, 007). */
export function QuestionCanvas({
	question,
	imageUrl,
	upload,
	showHints,
	onSaveText,
	onSaveChoiceText,
	onChange,
	onUploadImage,
}: {
	question: QuestionData;
	/** Public URL of the question's image, if it has one. */
	imageUrl: string | null;
	upload: ImageUploadState;
	/** False for a question the creator has just started: no warnings yet (spec 004, RN-16). */
	showHints: boolean;
	onSaveText: (text: string | null) => Promise<unknown>;
	onSaveChoiceText: (choiceId: string, text: string | null) => Promise<unknown>;
	/** Changes saved at once: corrects and the extra answers. */
	onChange: (change: QuestionChange) => void;
	onUploadImage: (file: File) => void;
}) {
	return (
		// As in Kahoot, the question takes the whole middle of the editor: the
		// text and the answers span its width, and the media gets the height left.
		<div className="flex min-h-full w-full flex-col gap-3 sm:gap-4">
			{/* Keyed by question so switching questions never mixes their texts. */}
			<QuestionTextField
				key={question.id}
				questionId={question.id}
				initialText={question.text}
				hint={showHints}
				onSave={onSaveText}
			/>

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

			{question.type === "quiz" ? (
				<QuizAnswers
					question={question}
					showHints={showHints}
					onSaveChoiceText={onSaveChoiceText}
					onChange={onChange}
				/>
			) : (
				<TrueFalseAnswers
					correct={question.correct}
					showHint={showHints}
					onCorrectChange={(correct) =>
						onChange({ kind: "trueFalseCorrect", correct })
					}
				/>
			)}
		</div>
	);
}
