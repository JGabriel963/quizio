import { MAX_CHOICE_COUNT } from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import {
	missingAnswerHints,
	questionIssues,
} from "@quizio/core/quiz/domain/question-issues";
import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import { ImageIcon, MinusIcon, PlusIcon } from "lucide-react";

import type { QuestionData } from "@/lib/api-types";
import { QUESTION_ISSUE_LABELS } from "@/lib/question-labels";

import { ChoiceField } from "./choice-field";
import { QuestionTextField } from "./question-text-field";

/** The selected question in the middle of the editor (specs 003, 004). */
export function QuestionCanvas({
	question,
	onSaveText,
	onSaveChoiceText,
	onChange,
}: {
	question: QuestionData;
	onSaveText: (text: string | null) => Promise<unknown>;
	onSaveChoiceText: (choiceId: string, text: string | null) => Promise<unknown>;
	/** Changes saved at once: corrects and the extra answers. */
	onChange: (change: QuestionChange) => void;
}) {
	const hints = missingAnswerHints(question);
	const noCorrect = questionIssues(question).includes("noCorrectAnswer");
	const extrasVisible = question.choices.length === MAX_CHOICE_COUNT;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
			{/* Keyed by question so switching questions never mixes their texts. */}
			<QuestionTextField
				key={question.id}
				questionId={question.id}
				initialText={question.text}
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
				{noCorrect && (
					<p className="text-center font-semibold text-sm text-white">
						{QUESTION_ISSUE_LABELS.noCorrectAnswer}
					</p>
				)}
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
		</div>
	);
}
