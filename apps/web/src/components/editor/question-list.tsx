import {
	type Announcements,
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	MouseSensor,
	type ScreenReaderInstructions,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QuestionType } from "@quizio/core/quiz/domain/question";
import { questionIssues } from "@quizio/core/quiz/domain/question-issues";
import { Button } from "@quizio/ui/components/button";
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
	SparklesIcon,
	Trash2Icon,
} from "lucide-react";
import {
	type MouseEventHandler,
	type TouchEventHandler,
	useEffect,
	useId,
	useRef,
} from "react";

import type { QuestionData } from "@/lib/api-types";
import { questionIssueLabel } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton, questionActionReasons } from "./question-actions";
import { QuestionImageView, thumbnailImage } from "./question-image-view";
import { QuestionTypePicker } from "./question-type-picker";
import { TRUE_FALSE_ANSWERS } from "./true-false-answers";

export interface QuestionListProps {
	questions: QuestionData[];
	/** Public URLs of the question images, by key (spec 007, RN-32). */
	imageUrls?: Record<string, string>;
	selectedId: string;
	/** Questions the creator has just started: no incomplete alert yet (spec 004, RN-16). */
	quietIds: ReadonlySet<string>;
	onSelect: (questionId: string) => void;
	/** The type chosen in the picker (spec 005). */
	onAdd: (type: QuestionType) => void;
	onDuplicate: (questionId: string) => void;
	onDelete: (questionId: string) => void;
	onMove: (questionId: string, toIndex: number) => void;
	/** Opens the creation assistant; without it there is no "Crie" (spec 027, RN-01, RN-02). */
	onCreate?: () => void;
}

/**
 * Left panel: the ordered questions, sortable by drag or keyboard (spec 003),
 * with each one's time and an alert when incomplete (spec 004), and the type
 * picker to add one (spec 005). On compact screens it is a horizontal strip of
 * plain thumbnails, reordered by holding and dragging a card (as in Kahoot).
 */
export function QuestionList({
	questions,
	imageUrls = {},
	selectedId,
	quietIds,
	onSelect,
	onAdd,
	onDuplicate,
	onDelete,
	onMove,
	onCreate,
}: QuestionListProps) {
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
		// Hold to drag on touch screens, so a swipe still scrolls the strip.
		useSensor(TouchSensor, {
			activationConstraint: { delay: 250, tolerance: 5 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const { deleteReason, growReason } = questionActionReasons(questions.length);
	const listRef = useRef<HTMLDivElement>(null);

	// Keeps the selected question in view, e.g. one just added at the end of a long list.
	useEffect(() => {
		listRef.current
			?.querySelector(`[data-question-id="${selectedId}"]`)
			?.scrollIntoView?.({ block: "nearest" });
	}, [selectedId]);
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
		<div className="flex min-h-0 flex-col max-lg:flex-row max-lg:items-center">
			{/* Grows with the questions; once they overflow, only they scroll and the picker stays below (as in Kahoot). */}
			<div
				ref={listRef}
				className="min-h-0 overflow-y-auto p-3 pb-0 max-lg:min-w-0 max-lg:flex-1 max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:pb-3"
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					accessibility={{ announcements, screenReaderInstructions }}
				>
					<SortableContext
						items={questions.map(({ id }) => id)}
						strategy={rectSortingStrategy}
					>
						<ol
							aria-label="Perguntas"
							className="flex flex-col gap-2 max-lg:flex-row"
						>
							{questions.map((question, index) => (
								<QuestionListItem
									key={question.id}
									question={question}
									imageUrl={
										question.image ? imageUrls[question.image.key] : undefined
									}
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
			</div>

			<div className="flex shrink-0 flex-col gap-2 p-3 max-lg:flex-row max-lg:pl-1">
				<QuestionTypePicker unavailableReason={growReason} onPick={onAdd} />
				{onCreate && (
					<Button
						variant="ai"
						className="w-full max-lg:size-11 max-lg:px-0 max-lg:has-data-[icon=inline-start]:pl-0"
						onClick={onCreate}
					>
						<SparklesIcon data-icon="inline-start" className="text-brand" />
						{/* Only the icon in the compact strip, like Adicionar. */}
						<span className="max-lg:sr-only">Crie</span>
					</Button>
				)}
			</div>
		</div>
	);
}

const screenReaderInstructions: ScreenReaderInstructions = {
	draggable:
		"Para mover a pergunta, pressione Espaço, use as setas para cima e para baixo e pressione Espaço de novo para soltar. Esc cancela.",
};

function QuestionListItem({
	question,
	imageUrl,
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
	imageUrl: string | undefined;
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
			data-question-id={question.id}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"relative flex flex-col gap-1 rounded-md p-1 max-lg:shrink-0 max-lg:flex-row max-lg:items-start",
				selected && "bg-accent",
				isDragging && "z-10 opacity-80",
			)}
		>
			<p className="font-bold text-xs">
				{position}
				<span className="max-lg:hidden">{` ${typeLabel}`}</span>
				{/* Added by the creation assistant (spec 027, RN-29). */}
				{question.aiGenerated && (
					<>
						<SparklesIcon
							aria-hidden="true"
							className="ml-1 inline size-3 align-[-2px] text-brand max-lg:hidden"
						/>
						<span className="sr-only">feita com IA</span>
					</>
				)}
			</p>
			<div className="flex items-stretch gap-1">
				<div className="flex flex-col items-center justify-center gap-1 max-lg:hidden">
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
						// The card drags too, by mouse or by holding it (as in Kahoot); the
						// keyboard keeps Enter and Space for selecting, and moves by the handle.
						onMouseDown={
							listeners?.onMouseDown as MouseEventHandler | undefined
						}
						onTouchStart={
							listeners?.onTouchStart as TouchEventHandler | undefined
						}
						onClick={() => onSelect(question.id)}
						className={cn(
							"flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md border-2 bg-card p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-lg:w-24 max-lg:justify-center",
							selected ? "border-primary" : "border-border hover:border-input",
						)}
					>
						{/* Same height with or without text, so every card lines up. */}
						<span
							className={cn(
								"h-4 w-full truncate text-center text-xs leading-4 max-lg:hidden",
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
							<span className="absolute left-0 flex size-6 items-center justify-center rounded-full border border-border bg-card font-bold text-[0.625rem] text-muted-foreground max-lg:hidden">
								{question.timeLimitSeconds}
							</span>
							{question.image && imageUrl ? (
								<span
									data-slot="question-thumbnail"
									className="block h-7 w-10 overflow-hidden rounded-sm"
								>
									<QuestionImageView
										image={thumbnailImage(question.image)}
										url={imageUrl}
										decorative
									/>
								</span>
							) : (
								<span className="flex h-7 w-10 items-center justify-center rounded-sm border border-muted-foreground/40 border-dashed">
									<ImageIcon className="size-3.5 text-muted-foreground/60" />
								</span>
							)}
						</span>
						{question.type === "slider" ? (
							<SliderThumbnail answer={question.answer} />
						) : question.type === "puzzle" ? (
							<PuzzleThumbnail />
						) : (
							<span
								aria-hidden="true"
								className="grid w-full grid-cols-2 gap-1 max-lg:hidden"
							>
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
						)}
					</button>
				</div>
			</div>
		</li>
	);
}

/** A slider's thumbnail: a scale, with the marker once there is an answer (spec 032, RN-17). */
function SliderThumbnail({ answer }: { answer: number | null }) {
	return (
		<span
			aria-hidden="true"
			data-slot="slider-thumbnail"
			className="relative flex h-4 w-full items-end justify-between rounded-sm border border-border bg-card px-1 pb-0.5 max-lg:hidden"
		>
			{Array.from({ length: 16 }, (_, index) => (
				<span key={index} className="h-2 w-px bg-foreground/30" />
			))}
			{answer !== null && (
				<span
					data-slot="slider-thumbnail-marker"
					className="absolute top-0 left-1/2 h-2 w-3 -translate-x-1/2 rounded-[1px] bg-foreground/40"
				/>
			)}
		</span>
	);
}

/** A puzzle's thumbnail: four bars stacked in the middle, one per slot (spec 033, RN-13). */
function PuzzleThumbnail() {
	return (
		<span
			aria-hidden="true"
			data-slot="puzzle-thumbnail"
			className="mx-auto flex w-1/2 flex-col gap-0.5 max-lg:hidden"
		>
			{["a", "b", "c", "d"].map((slot) => (
				<span
					key={slot}
					data-slot="answer-bar"
					className="h-1.5 rounded-sm border border-border bg-card"
				/>
			))}
		</span>
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
	if (question.type === "slider" || question.type === "puzzle") {
		return [];
	}
	if (question.type === "typeAnswer") {
		// One bar per accepted answer, as in Kahoot's list (spec 031, RN-11).
		return question.acceptedAnswers.map((_, index) => ({
			key: `accepted-${index}`,
			correct: false,
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
		.map((issue) => `${questionIssueLabel(question, issue)}.`)
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
