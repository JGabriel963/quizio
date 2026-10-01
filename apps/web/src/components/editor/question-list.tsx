import {
	type Announcements,
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	type ScreenReaderInstructions,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { questionIssues } from "@quizio/core/quiz/domain/question-issues";
import {
	ANSWER_COLOR_CLASSES,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	CopyIcon,
	GripVerticalIcon,
	PlusIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useId } from "react";

import type { QuestionData } from "@/lib/api-types";
import { QUESTION_ISSUE_LABELS } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton, questionActionReasons } from "./question-actions";

export interface QuestionListProps {
	questions: QuestionData[];
	selectedId: string;
	onSelect: (questionId: string) => void;
	onAdd: () => void;
	onDuplicate: (questionId: string) => void;
	onDelete: (questionId: string) => void;
	onMove: (questionId: string, toIndex: number) => void;
}

/**
 * Left panel: the ordered questions, sortable by drag or keyboard (spec 003),
 * with each one's time and an alert when incomplete (spec 004).
 */
export function QuestionList({
	questions,
	selectedId,
	onSelect,
	onAdd,
	onDuplicate,
	onDelete,
	onMove,
}: QuestionListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const { deleteReason, growReason } = questionActionReasons(questions.length);
	const positionOf = (id: string | number) =>
		questions.findIndex((question) => question.id === id) + 1;

	const announcements: Announcements = {
		onDragStart: ({ active }) =>
			`Pergunta ${positionOf(active.id)} selecionada para mover.`,
		onDragOver: ({ active, over }) =>
			over
				? `Pergunta ${positionOf(active.id)} sobre a posição ${positionOf(over.id)}.`
				: undefined,
		onDragEnd: ({ active, over }) =>
			over
				? `Pergunta ${positionOf(active.id)} movida para a posição ${positionOf(over.id)}.`
				: `Pergunta ${positionOf(active.id)} solta.`,
		onDragCancel: ({ active }) =>
			`Movimento cancelado. A pergunta ${positionOf(active.id)} voltou ao lugar.`,
	};

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		if (over && active.id !== over.id) {
			onMove(String(active.id), positionOf(over.id) - 1);
		}
	};

	return (
		<div className="flex flex-col gap-3 p-3">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
				accessibility={{ announcements, screenReaderInstructions }}
			>
				<SortableContext
					items={questions.map(({ id }) => id)}
					strategy={verticalListSortingStrategy}
				>
					<ol aria-label="Perguntas" className="flex flex-col gap-2">
						{questions.map((question, index) => (
							<QuestionListItem
								key={question.id}
								question={question}
								position={index + 1}
								selected={question.id === selectedId}
								deleteReason={deleteReason}
								duplicateReason={growReason}
								onSelect={onSelect}
								onDuplicate={onDuplicate}
								onDelete={onDelete}
							/>
						))}
					</ol>
				</SortableContext>
			</DndContext>

			<ActionButton unavailableReason={growReason} onClick={onAdd}>
				<PlusIcon data-icon="inline-start" />
				Adicionar
			</ActionButton>
		</div>
	);
}

const screenReaderInstructions: ScreenReaderInstructions = {
	draggable:
		"Para mover a pergunta, pressione Espaço, use as setas para cima e para baixo e pressione Espaço de novo para soltar. Esc cancela.",
};

function QuestionListItem({
	question,
	position,
	selected,
	deleteReason,
	duplicateReason,
	onSelect,
	onDuplicate,
	onDelete,
}: {
	question: QuestionData;
	position: number;
	selected: boolean;
	deleteReason: string | null;
	duplicateReason: string | null;
	onSelect: (questionId: string) => void;
	onDuplicate: (questionId: string) => void;
	onDelete: (questionId: string) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: question.id });
	const typeLabel = questionTypeLabel(question.type);

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex flex-col gap-1 rounded-md p-1",
				selected && "bg-accent",
				isDragging && "relative z-10 opacity-80",
			)}
		>
			<div className="flex items-center gap-1">
				<p className="font-bold text-xs">{`${position} ${typeLabel}`}</p>
				<IncompleteAlert question={question} position={position} />
			</div>
			<div className="flex items-stretch gap-1">
				<div className="flex flex-col items-center justify-center gap-1">
					<button
						type="button"
						ref={setActivatorNodeRef}
						aria-label={`Mover pergunta ${position}`}
						className="cursor-grab rounded-sm p-0.5 text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
						{...attributes}
						{...listeners}
					>
						<GripVerticalIcon aria-hidden="true" className="size-4" />
					</button>
					<ActionButton
						variant="ghost"
						size="icon-xs"
						aria-label={`Duplicar pergunta ${position}`}
						unavailableReason={duplicateReason}
						onClick={() => onDuplicate(question.id)}
					>
						<CopyIcon />
					</ActionButton>
					<ActionButton
						variant="ghost"
						size="icon-xs"
						aria-label={`Excluir pergunta ${position}`}
						unavailableReason={deleteReason}
						onClick={() => onDelete(question.id)}
					>
						<Trash2Icon />
					</ActionButton>
				</div>
				<button
					type="button"
					aria-label={`Pergunta ${position}: ${question.text ?? "sem texto"}`}
					aria-current={selected ? "true" : undefined}
					onClick={() => onSelect(question.id)}
					className={cn(
						"flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md border-2 bg-card p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
						selected ? "border-primary" : "border-border hover:border-input",
					)}
				>
					<span className="w-full truncate text-center text-muted-foreground text-xs">
						{question.text}
					</span>
					<span aria-hidden="true" className="flex w-full items-center gap-1">
						<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[0.625rem]">
							{question.timeLimitSeconds}
						</span>
						<span className="mx-auto h-6 w-10 rounded-sm border border-muted-foreground/40 border-dashed" />
					</span>
					<span aria-hidden="true" className="grid w-full grid-cols-2 gap-1">
						{question.choices.map((choice, index) => (
							<span
								key={choice.id}
								className={cn(
									"h-1.5 rounded-sm",
									choice.text === null
										? "bg-muted"
										: ANSWER_COLOR_CLASSES[answerShapeAt(index)],
								)}
							/>
						))}
					</span>
				</button>
			</div>
		</li>
	);
}

/** Warning icon of an incomplete question, its reasons in a tooltip and the description (RN-14, RN-15). */
function IncompleteAlert({
	question,
	position,
}: {
	question: QuestionData;
	position: number;
}) {
	const reasonsId = useId();
	const issues = questionIssues(question);
	if (issues.length === 0) {
		return null;
	}
	const reasons = issues
		.map((issue) => `${QUESTION_ISSUE_LABELS[issue]}.`)
		.join(" ");
	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={`Pergunta ${position} incompleta`}
							aria-describedby={reasonsId}
							className="ml-auto rounded-sm text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
					}
				>
					<TriangleAlertIcon aria-hidden="true" className="size-4" />
				</TooltipTrigger>
				<TooltipContent>{reasons}</TooltipContent>
			</Tooltip>
			<span id={reasonsId} hidden>
				{reasons}
			</span>
		</>
	);
}
