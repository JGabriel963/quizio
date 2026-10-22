import {
	MAX_ACCEPTED_ANSWERS,
	TYPE_ANSWER_MAX_LENGTH,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { useId, useState } from "react";

import { NO_ACCEPTED_ANSWER_HINT } from "@/lib/question-labels";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import { EditorHint } from "./editor-hint";

/** Each field's color, by position: the main one is blue (spec 031, RN-05). */
const FIELD_COLORS = [
	"bg-answer-blue",
	"bg-answer-yellow",
	"bg-answer-green",
	"bg-answer-teal",
] as const;

/**
 * The accepted answers of a type answer (spec 031, RN-03 to RN-05, RN-09):
 * the main field, then "Adicionar outras respostas aceitas", which shows the
 * extra fields one at a time up to four. An extra field left empty goes away.
 */
export function TypeAnswerAnswers({
	questionId,
	acceptedAnswers,
	hint,
	onSaveAnswer,
	onChange,
}: {
	questionId: string;
	acceptedAnswers: (string | null)[];
	/** Shows "Adicione uma resposta aceita" under the main field (RN-09). */
	hint: boolean;
	onSaveAnswer: (index: number, text: string | null) => Promise<unknown>;
	onChange: (change: QuestionChange) => void;
}) {
	const [main, ...extra] = acceptedAnswers;
	const canAdd = acceptedAnswers.length < MAX_ACCEPTED_ANSWERS;
	// Removing a field moves the ones after it: they start over from the data.
	const generation = acceptedAnswers.length;

	return (
		<section aria-label="Respostas aceitas" className="flex flex-col gap-3">
			<div className="mx-auto w-full max-w-3xl">
				<AcceptedAnswerField
					questionId={questionId}
					index={0}
					text={main ?? null}
					large
					hint={hint}
					onSave={(text) => onSaveAnswer(0, text)}
				/>
			</div>
			{extra.length === 0 ? (
				<Button
					variant="secondary"
					className="mx-auto underline"
					onClick={() => onChange({ kind: "acceptedAnswerAdded" })}
				>
					Adicionar outras respostas aceitas
				</Button>
			) : (
				<>
					<p className="mx-auto rounded-md bg-foreground/85 px-3 py-1.5 font-bold text-background text-sm">
						Outras respostas aceitas
					</p>
					<div className="grid gap-2 sm:grid-cols-3">
						{extra.map((text, offset) => {
							const index = offset + 1;
							return (
								<AcceptedAnswerField
									key={`${generation}:${index}`}
									questionId={questionId}
									index={index}
									text={text}
									hint={false}
									onSave={(value) => onSaveAnswer(index, value)}
									onLeftEmpty={() =>
										onChange({ kind: "acceptedAnswerRemoved", index })
									}
								/>
							);
						})}
						{canAdd && (
							<Button
								variant="secondary"
								className="self-center justify-self-start underline"
								onClick={() => onChange({ kind: "acceptedAnswerAdded" })}
							>
								Adicionar mais
							</Button>
						)}
					</div>
				</>
			)}
		</section>
	);
}

function AcceptedAnswerField({
	questionId,
	index,
	text,
	large = false,
	hint,
	onSave,
	onLeftEmpty,
}: {
	questionId: string;
	index: number;
	text: string | null;
	large?: boolean;
	hint: boolean;
	onSave: (text: string | null) => Promise<unknown>;
	onLeftEmpty?: () => void;
}) {
	const hintId = useId();
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:accepted:${index}`,
		initialValue: text ?? "",
		save: (typed: string) => onSave(typed.trim() === "" ? null : typed),
	});
	const left = TYPE_ANSWER_MAX_LENGTH - characterCount(value);
	const label =
		index === 0 ? "Resposta aceita" : `Outra resposta aceita ${index}`;

	return (
		<div className="relative">
			<div
				className={cn(
					"flex items-center gap-2 rounded-md px-4 text-answer-foreground shadow-press-light",
					FIELD_COLORS[index] ?? FIELD_COLORS[0],
					large ? "min-h-16 sm:min-h-20" : "min-h-14",
				)}
			>
				<input
					aria-label={label}
					aria-describedby={hint ? hintId : undefined}
					placeholder="Digite uma resposta aceita"
					value={value}
					onFocus={() => setFocused(true)}
					onChange={(event) =>
						setValue(
							truncateCharacters(event.target.value, TYPE_ANSWER_MAX_LENGTH),
						)
					}
					onBlur={async () => {
						setFocused(false);
						await flush();
						if (value.trim() === "") {
							onLeftEmpty?.();
						}
					}}
					className={cn(
						"min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:text-answer-foreground/70",
						large ? "text-2xl sm:text-3xl" : "text-xl",
					)}
				/>
				{focused && (
					<span className="self-start pt-2 font-bold text-sm">
						<span aria-hidden="true">{left}</span>
						<span className="sr-only">{left} caracteres restantes</span>
					</span>
				)}
			</div>
			{hint && <EditorHint id={hintId}>{NO_ACCEPTED_ANSWER_HINT}</EditorHint>}
		</div>
	);
}
