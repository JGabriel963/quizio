import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { Badge } from "@quizio/ui/components/badge";
import { ImageIcon } from "lucide-react";

import type { QuestionData } from "@/lib/api-types";

import { QuestionTextField } from "./question-text-field";
import { QuizAnswers } from "./quiz-answers";
import { TrueFalseAnswers } from "./true-false-answers";

/** The selected question in the middle of the editor (specs 003 to 005). */
export function QuestionCanvas({
	question,
	showHints,
	onSaveText,
	onSaveChoiceText,
	onChange,
}: {
	question: QuestionData;
	/** False for a question the creator has just started: no warnings yet (spec 004, RN-16). */
	showHints: boolean;
	onSaveText: (text: string | null) => Promise<unknown>;
	onSaveChoiceText: (choiceId: string, text: string | null) => Promise<unknown>;
	/** Changes saved at once: corrects and the extra answers. */
	onChange: (change: QuestionChange) => void;
}) {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
			{/* Keyed by question so switching questions never mixes their texts. */}
			<QuestionTextField
				key={question.id}
				questionId={question.id}
				initialText={question.text}
				hint={showHints}
				onSave={onSaveText}
			/>

			<section
				aria-label="Mídia"
				className="mx-auto flex aspect-video w-full max-w-xl flex-col items-center justify-center gap-3 rounded-md bg-card/70 p-6 text-center"
			>
				<ImageIcon
					aria-hidden="true"
					className="size-10 text-muted-foreground"
				/>
				<p className="font-semibold text-muted-foreground">
					Encontre e insira mídia
				</p>
				<Badge variant="soon">Em breve</Badge>
			</section>

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
