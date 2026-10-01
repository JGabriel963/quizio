import {
	QUESTION_POINTS,
	QUESTION_TYPES,
	type QuestionType,
	SELECTION_MODES,
	TIME_LIMITS_SECONDS,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { Button } from "@quizio/ui/components/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
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
import { QuestionTypeIcon } from "./question-type-icon";

/**
 * Right panel (specs 004, 005): type, time limit with "apply to all", points
 * and, for quiz questions, the answer options, each saved when chosen.
 */
export function QuestionPropertiesPanel({
	question,
	questionCount,
	onChange,
	onChangeType,
	onApplyTimeLimitToAll,
	onDelete,
	onDuplicate,
}: {
	question: QuestionData;
	questionCount: number;
	onChange: (change: QuestionChange) => void;
	onChangeType: (type: QuestionType) => void;
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

			<PropertyField
				label="Tipo de pergunta"
				icon={<ListChecksIcon aria-hidden="true" className="size-4" />}
			>
				{(labelId) => (
					<Select
						value={question.type}
						onValueChange={(type) => onChangeType(type as QuestionType)}
					>
						<SelectTrigger aria-labelledby={labelId} className="h-12">
							<SelectValue>
								{(type: QuestionType) => (
									<>
										<QuestionTypeIcon type={type} className="h-7 w-5.5" />
										{questionTypeLabel(type)}
									</>
								)}
							</SelectValue>
						</SelectTrigger>
						{/* Cards grouped like Kahoot's type list (spec 005, RN-14). */}
						<SelectContent className="p-3">
							<SelectGroup>
								<SelectLabel className="px-0 pt-0">
									Testar conhecimento
								</SelectLabel>
								<div className="grid grid-cols-2 gap-2">
									{QUESTION_TYPES.map((type) => (
										<SelectItem key={type} value={type} variant="tile">
											<QuestionTypeIcon type={type} />
											{questionTypeLabel(type)}
										</SelectItem>
									))}
								</div>
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
			</PropertyField>

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

			{question.type === "quiz" && (
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
			)}

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

/** A labelled property; the label's id names the control it wraps. */
function PropertyField({
	label,
	icon,
	children,
}: {
	label: string;
	icon: ReactNode;
	children: (labelId: string) => ReactNode;
}) {
	const labelId = useId();
	return (
		<div className="flex flex-col gap-2">
			<span id={labelId} className="flex items-center gap-2 font-bold text-sm">
				{icon}
				{label}
			</span>
			{children(labelId)}
		</div>
	);
}

/** A property chosen from a short list, with the design system's Select. */
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
	return (
		<PropertyField label={label} icon={icon}>
			{(labelId) => (
				<>
					<Select
						items={options}
						value={value}
						onValueChange={(next) => onChange(next as string)}
					>
						<SelectTrigger aria-labelledby={labelId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{children}
				</>
			)}
		</PropertyField>
	);
}
