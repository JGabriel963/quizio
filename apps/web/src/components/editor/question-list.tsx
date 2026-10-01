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
import type { QuestionType } from "@quizio/core/quiz/domain/question";
import { questionIssues } from "@quizio/core/quiz/domain/question-issues";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	CopyIcon,
	GripVerticalIcon,
	ImageIcon,
	Trash2Icon,
} from "lucide-react";
import { useId } from "react";

import type { QuestionData } from "@/lib/api-types";
import { QUESTION_ISSUE_LABELS } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton, questionActionReasons } from "./question-actions";
import { QuestionTypePicker } from "./question-type-picker";
import { TRUE_FALSE_ANSWERS } from "./true-false-answers";

export interface QuestionListProps {
	questions: QuestionData[];
	selectedId: string;
	/** Questions the creator has just started: no incomplete alert yet (spec 004, RN-16). */
	quietIds: ReadonlySet<string>;
	onSelect: (questionId: string) => void;
	/** The type chosen in the picker (spec 005). */
	onAdd: (type: QuestionType) => void;
	onDuplicate: (questionId: string) => void;
	onDelete: (questionId: string) => void;
	onMove: (questionId: string, toIndex: number) => void;
}

/**
 * Left panel: the ordered questions, sortable by drag or keyboard (spec 003),
 * with each one's time and an alert when incomplete (spec 004), and the type
 * picker to add one (spec 005).
 */
export function QuestionList({
	questions,
	selectedId,
	quietIds,
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
								quiet={quietIds.has(question.id)}
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

			<QuestionTypePicker unavailableReason={growReason} onPick={onAdd} />
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
	quiet,
	deleteReason,
	duplicateReason,
	onSelect,
	onDuplicate,
	onDelete,
}: {
	question: QuestionData;
	position: number;
	selected: boolean;
	quiet: boolean;
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
			<p className="font-bold text-xs">{`${position} ${typeLabel}`}</p>
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
				{/* The card and, on its right edge, the alert of an incomplete question. */}
				<div className="relative flex min-w-0 flex-1">
					{!quiet && (
						<IncompleteAlert question={question} position={position} />
					)}
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
						{/* Same height with or without text, so every card lines up. */}
						<span
							className={cn(
								"h-4 w-full truncate text-center text-xs leading-4",
								question.text === null
									? "text-muted-foreground/70"
									: "font-semibold text-foreground/80",
							)}
						>
							{question.text ?? "Pergunta"}
						</span>
						{/* The media placeholder sits in the middle of the card; the time, at its left. */}
						<span
							aria-hidden="true"
							className="relative flex h-7 w-full items-center justify-center"
						>
							<span className="absolute left-0 flex size-6 items-center justify-center rounded-full border border-border bg-card font-bold text-[0.625rem] text-muted-foreground">
								{question.timeLimitSeconds}
							</span>
							<span className="flex h-7 w-10 items-center justify-center rounded-sm border border-muted-foreground/40 border-dashed">
								<ImageIcon className="size-3.5 text-muted-foreground/60" />
							</span>
						</span>
						<span aria-hidden="true" className="grid w-full grid-cols-2 gap-1">
							{answerBars(question).map((bar) => (
								<span
									key={bar.key}
									data-slot="answer-bar"
									className="flex h-2.5 items-center justify-end rounded-sm border border-border bg-card pr-0.5"
								>
									{bar.correct && (
										<span
											data-slot="answer-bar-correct"
											className="size-1.5 rounded-full bg-answer-correct"
										/>
									)}
								</span>
							))}
						</span>
					</button>
				</div>
			</div>
		</li>
	);
}

/** The thumbnail's answer bars, one per answer slot, with a dot on the correct ones (as in Kahoot). */
function answerBars(
	question: QuestionData,
): { key: string; correct: boolean }[] {
	if (question.type === "trueFalse") {
		return TRUE_FALSE_ANSWERS.map(({ label, value }) => ({
			key: label,
			correct: question.correct === value,
		}));
	}
	return question.choices.map((choice) => ({
		key: choice.id,
		correct: choice.correct,
	}));
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
							className="absolute top-1/2 -right-2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground text-xs shadow-sm ring-2 ring-card focus-visible:ring-3 focus-visible:ring-ring/50"
						/>
					}
				>
					<span aria-hidden="true">!</span>
				</TooltipTrigger>
				<TooltipContent>{reasons}</TooltipContent>
			</Tooltip>
			<span id={reasonsId} hidden>
				{reasons}
			</span>
		</>
	);
}
