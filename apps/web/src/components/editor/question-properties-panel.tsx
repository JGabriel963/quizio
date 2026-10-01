import {
	QUESTION_POINTS,
	SELECTION_MODES,
	TIME_LIMITS_SECONDS,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { Button } from "@quizio/ui/components/button";
import {
	ClockIcon,
	CopyIcon,
	ListChecksIcon,
	SquareCheckIcon,
	Trash2Icon,
	TrophyIcon,
} from "lucide-react";
import { type ReactNode, useId } from "react";

import type { QuestionData } from "@/lib/api-types";
import {
	POINTS_LABELS,
	SELECTION_LABELS,
	timeLimitLabel,
} from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton, questionActionReasons } from "./question-actions";

/**
 * Right panel (spec 004): type (read-only until spec 005), time limit with
 * "apply to all", points and answer options, each saved when chosen.
 */
export function QuestionPropertiesPanel({
	question,
	questionCount,
	onChange,
	onApplyTimeLimitToAll,
	onDelete,
	onDuplicate,
}: {
	question: QuestionData;
	questionCount: number;
	onChange: (change: QuestionChange) => void;
	onApplyTimeLimitToAll: (seconds: QuestionData["timeLimitSeconds"]) => void;
	onDelete: (questionId: string) => void;
	onDuplicate: (questionId: string) => void;
}) {
	const { deleteReason, growReason } = questionActionReasons(questionCount);

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<h2 className="border-border border-b pb-3 font-bold">
				Propriedades da pergunta
			</h2>

			<div className="flex flex-col gap-2">
				<span className="flex items-center gap-2 font-bold text-sm">
					<ListChecksIcon aria-hidden="true" className="size-4" />
					Tipo de pergunta
				</span>
				<span className="rounded-md border border-input bg-muted px-3 py-2 font-semibold text-sm">
					{questionTypeLabel(question.type)}
				</span>
			</div>

			<PropertySelect
				label="Limite de tempo"
				icon={<ClockIcon aria-hidden="true" className="size-4" />}
				value={String(question.timeLimitSeconds)}
				options={TIME_LIMITS_SECONDS.map((seconds) => ({
					value: String(seconds),
					label: timeLimitLabel(seconds),
				}))}
				onChange={(value) =>
					onChange({ kind: "timeLimit", seconds: Number(value) })
				}
			>
				<Button
					variant="link"
					size="sm"
					className="self-start px-0"
					onClick={() => onApplyTimeLimitToAll(question.timeLimitSeconds)}
				>
					Aplicar a todas as perguntas
				</Button>
			</PropertySelect>

			<PropertySelect
				label="Pontos"
				icon={<TrophyIcon aria-hidden="true" className="size-4" />}
				value={question.points}
				options={QUESTION_POINTS.map((points) => ({
					value: points,
					label: POINTS_LABELS[points],
				}))}
				onChange={(points) => onChange({ kind: "points", points })}
			/>

			<PropertySelect
				label="Opções de resposta"
				icon={<SquareCheckIcon aria-hidden="true" className="size-4" />}
				value={question.selection}
				options={SELECTION_MODES.map((selection) => ({
					value: selection,
					label: SELECTION_LABELS[selection],
				}))}
				onChange={(selection) => onChange({ kind: "selection", selection })}
			/>

			<div className="mt-auto flex justify-center gap-2 border-border border-t pt-4">
				<ActionButton
					variant="secondary"
					unavailableReason={deleteReason}
					onClick={() => onDelete(question.id)}
				>
					<Trash2Icon data-icon="inline-start" />
					Excluir
				</ActionButton>
				<ActionButton
					variant="outline"
					unavailableReason={growReason}
					onClick={() => onDuplicate(question.id)}
				>
					<CopyIcon data-icon="inline-start" />
					Duplicar
				</ActionButton>
			</div>
		</div>
	);
}

/** Native select: simple, accessible and good on phones (plan 004). */
function PropertySelect({
	label,
	icon,
	value,
	options,
	onChange,
	children,
}: {
	label: string;
	icon: ReactNode;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
	children?: ReactNode;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="flex items-center gap-2 font-bold text-sm">
				{icon}
				{label}
			</label>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-10 rounded-md border border-input bg-card px-3 font-semibold text-sm shadow-press-light outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			{children}
		</div>
	);
}
