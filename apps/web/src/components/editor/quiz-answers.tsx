import {
	MAX_CHOICE_COUNT,
	type QuizQuestion,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import {
	missingAnswerHints,
	questionIssues,
} from "@quizio/core/quiz/domain/question-issues";
import { Button } from "@quizio/ui/components/button";
import { MinusIcon, PlusIcon } from "lucide-react";

import { NO_CORRECT_ANSWER_HINT } from "@/lib/question-labels";

import { ChoiceField } from "./choice-field";
import { EditorHint } from "./editor-hint";

/** The answer grid of a quiz question, with its hints and the extra answers (spec 004). */
export function QuizAnswers({
	question,
	showHints,
	onSaveChoiceText,
	onChange,
}: {
	question: QuizQuestion;
	/** Whether to point out what is missing (RN-16). */
	showHints: boolean;
	onSaveChoiceText: (choiceId: string, text: string | null) => Promise<unknown>;
	/** Changes saved at once: corrects and the extra answers. */
	onChange: (change: QuestionChange) => void;
}) {
	const hints = showHints ? missingAnswerHints(question) : [];
	const noCorrect =
		showHints && questionIssues(question).includes("noCorrectAnswer");
	const extrasVisible = question.choices.length === MAX_CHOICE_COUNT;

	return (
		<div className="flex flex-col gap-2">
			<ul
				aria-label="Respostas"
				className="grid grid-cols-1 gap-2 sm:grid-cols-2"
			>
				{question.choices.map((choice, index) => (
					<ChoiceField
						key={`${question.id}:${choice.id}`}
						questionId={question.id}
						choice={choice}
						index={index}
						hint={hints.includes(index + 1)}
						onSaveText={(text) => onSaveChoiceText(choice.id, text)}
						onCorrectChange={(correct) =>
							onChange({
								kind: "choiceCorrect",
								choiceId: choice.id,
								correct,
							})
						}
					/>
				))}
			</ul>
			{noCorrect && <EditorHint>{NO_CORRECT_ANSWER_HINT}</EditorHint>}
			<Button
				variant="secondary"
				size="sm"
				className="self-center"
				onClick={() =>
					onChange({ kind: "extraChoices", visible: !extrasVisible })
				}
			>
				{extrasVisible ? (
					<>
						<MinusIcon data-icon="inline-start" />
						Remover respostas extras
					</>
				) : (
					<>
						<PlusIcon data-icon="inline-start" />
						Adicionar mais respostas
					</>
				)}
			</Button>
		</div>
	);
}
