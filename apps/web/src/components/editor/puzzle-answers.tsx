import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	CHOICE_TEXT_MAX_LENGTH,
	type PuzzleQuestion,
} from "@quizio/core/quiz/domain/question";
import {
	applyQuestionChange,
	type QuestionChange,
} from "@quizio/core/quiz/domain/question-change";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { EqualIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BodyDragOverlay } from "@/components/game/body-drag-overlay";
import {
	BLOCK_SCREEN_READER_INSTRUCTIONS,
	blockAnnouncements,
	blockMovedAnnouncement,
	keyboardMoveTarget,
	useBlockSensors,
} from "@/lib/sortable";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

/** A slot's field as the list reaches it: its typed text and its pending save. */
interface SlotField {
	flush: () => Promise<void>;
	text: () => string | null;
}

function sameItems(
	a: readonly (string | null)[],
	b: readonly (string | null)[],
): boolean {
	return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** Under a puzzle's answers in the editor (spec 033, RN-06). */
export const PUZZLE_EDITOR_HINT =
	"Adicione no mínimo 3 respostas na ordem correta. Elas serão embaralhadas automaticamente durante o jogo.";

const slotId = (index: number) => `slot-${index}`;
const slotIndex = (id: string | number) => Number(String(id).slice(5));

function placeholderOf(index: number, count: number): string {
	return index === count - 1
		? `Adicionar resposta ${index + 1} (opcional)`
		: `Adicionar resposta ${index + 1}`;
}

/**
 * A puzzle's four answers in the right order (spec 033, RN-03 to RN-06). The
 * shape column stays put; a field dragged by its ≡, or moved with ↑ and ↓,
 * takes its text to another place and the color of that place.
 */
export function PuzzleAnswers({
	question,
	onSaveItem,
	onChange,
}: {
	question: PuzzleQuestion;
	/** The autosaved text of a slot. */
	onSaveItem: (index: number, text: string | null) => Promise<unknown>;
	onChange: (change: QuestionChange) => void;
}) {
	const sensors = useBlockSensors();
	const fields = useRef(new Map<number, SlotField>());
	// A move rewrites the slots: the fields start over from the moved texts.
	const [generation, setGeneration] = useState(0);
	// The moved texts, until the question brings them: the editor's cache
	// may reach this screen a render after the move.
	const [moved, setMoved] = useState<(string | null)[] | null>(null);
	const items = moved ?? question.items;
	const [dragged, setDragged] = useState<number | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const [focusHandle, setFocusHandle] = useState<number | null>(null);
	const handles = useRef(new Map<number, HTMLButtonElement>());

	// The first question after a move is the move itself; anything else (a
	// refusal reloaded the editor) is shown as the question has it.
	const lastItems = useRef(question.items);
	useEffect(() => {
		if (lastItems.current === question.items) {
			return;
		}
		lastItems.current = question.items;
		if (moved && !sameItems(moved, question.items)) {
			setGeneration((value) => value + 1);
		}
		setMoved(null);
	}, [question.items, moved]);

	useEffect(() => {
		if (focusHandle !== null) {
			handles.current.get(focusHandle)?.focus();
			setFocusHandle(null);
		}
	}, [focusHandle]);

	const registerField = useCallback(
		(index: number, field: SlotField | null) => {
			if (field) {
				fields.current.set(index, field);
			} else {
				fields.current.delete(index);
			}
		},
		[],
	);

	const move = (from: number, to: number) => {
		// What the fields show, typed texts included.
		const texts = items.map(
			(item, index) => fields.current.get(index)?.text() ?? item,
		);
		// Texts still waiting go first, so none is written to the wrong place.
		for (const field of fields.current.values()) {
			void field.flush();
		}
		const change: QuestionChange = { kind: "puzzleItemMoved", from, to };
		onChange(change);
		setMoved(
			(
				applyQuestionChange({ ...question, items: texts }, change)
					.question as PuzzleQuestion
			).items,
		);
		setGeneration((current) => current + 1);
	};

	const blocks = items.map((text, index) => ({
		id: slotId(index),
		label: text,
	}));

	const handleDragStart = ({ active }: DragStartEvent) =>
		setDragged(slotIndex(active.id));
	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		setDragged(null);
		if (over && active.id !== over.id) {
			move(slotIndex(active.id), slotIndex(over.id));
		}
	};

	const moveByKey = (index: number, key: string) => {
		const to = keyboardMoveTarget(key, index, items.length);
		if (to === null) {
			return false;
		}
		move(index, to);
		setAnnouncement(
			blockMovedAnnouncement(
				items[index] ?? `Resposta ${index + 1}`,
				to + 1,
				items.length,
			),
		);
		setFocusHandle(to);
		return true;
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-[auto_1fr] gap-2">
				<ol aria-hidden="true" className="flex flex-col gap-2">
					{items.map((_, index) => {
						const shape = answerShapeAt(index);
						return (
							<li
								key={shape}
								data-slot="puzzle-position-shape"
								className={cn(
									"flex min-h-16 w-10 items-center justify-center rounded-md text-answer-foreground shadow-press-light sm:min-h-[clamp(4.5rem,11svh,7rem)] xl:w-12",
									ANSWER_COLOR_CLASSES[shape],
								)}
							>
								<AnswerShape shape={shape} className="size-5 xl:size-7" />
							</li>
						);
					})}
				</ol>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={() => setDragged(null)}
					accessibility={{
						announcements: blockAnnouncements(blocks),
						screenReaderInstructions: BLOCK_SCREEN_READER_INSTRUCTIONS,
					}}
				>
					<SortableContext
						items={blocks.map(({ id }) => id)}
						strategy={verticalListSortingStrategy}
					>
						<ol
							aria-label="Respostas na ordem correta"
							className="flex flex-col gap-2"
						>
							{items.map((text, index) => (
								<PuzzleAnswerField
									key={`${question.id}:${generation}:${slotId(index)}`}
									questionId={question.id}
									index={index}
									count={items.length}
									text={text}
									hidden={dragged === index}
									onSave={(typed) => onSaveItem(index, typed)}
									registerField={registerField}
									handleRef={(element) => {
										if (element) {
											handles.current.set(index, element);
										} else {
											handles.current.delete(index);
										}
									}}
									onMoveKey={(key) => moveByKey(index, key)}
								/>
							))}
						</ol>
					</SortableContext>
					<BodyDragOverlay>
						{dragged !== null && (
							<DraggedAnswer index={dragged} text={items[dragged] ?? null} />
						)}
					</BodyDragOverlay>
				</DndContext>
			</div>
			<p role="status" className="sr-only">
				{announcement}
			</p>
			<p className="self-center rounded-sm bg-card px-2 py-1 text-center text-xs shadow-sm">
				{PUZZLE_EDITOR_HINT}
			</p>
		</div>
	);
}

function PuzzleAnswerField({
	questionId,
	index,
	count,
	text,
	hidden,
	onSave,
	registerField,
	handleRef,
	onMoveKey,
}: {
	questionId: string;
	index: number;
	count: number;
	text: string | null;
	/** Its copy follows the pointer while it is dragged. */
	hidden: boolean;
	onSave: (text: string | null) => Promise<unknown>;
	registerField: (index: number, field: SlotField | null) => void;
	handleRef: (element: HTMLButtonElement | null) => void;
	/** ↑ or ↓ on the handle; true when it moved. */
	onMoveKey: (key: string) => boolean;
}) {
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:puzzle:${index}`,
		initialValue: text ?? "",
		save: (typed: string) => onSave(typed.trim() === "" ? null : typed),
	});
	const typed = useRef(value);
	typed.current = value;
	useEffect(() => {
		registerField(index, {
			flush,
			text: () => typed.current.trim() || null,
		});
		return () => registerField(index, null);
	}, [index, flush, registerField]);
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
	} = useSortable({ id: slotId(index) });
	const filled = value.trim() !== "";
	const shape = answerShapeAt(index);
	const left = CHOICE_TEXT_MAX_LENGTH - characterCount(value);
	const name = filled ? value.trim() : `resposta ${index + 1}`;

	return (
		<li
			ref={setNodeRef}
			data-slot="puzzle-answer"
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"relative flex min-h-16 items-center gap-2 rounded-md py-2 pr-2 pl-4 shadow-press-light transition-colors sm:min-h-[clamp(4.5rem,11svh,7rem)]",
				filled
					? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
					: "bg-card",
				hidden && "opacity-0",
			)}
		>
			<input
				aria-label={`Resposta ${index + 1}`}
				placeholder={placeholderOf(index, count)}
				value={value}
				onFocus={() => setFocused(true)}
				onChange={(event) =>
					setValue(
						truncateCharacters(event.target.value, CHOICE_TEXT_MAX_LENGTH),
					)
				}
				onBlur={() => {
					setFocused(false);
					void flush();
				}}
				className={cn(
					"min-w-0 flex-1 bg-transparent font-bold outline-none xl:text-lg",
					filled
						? "placeholder:text-answer-foreground/70"
						: "placeholder:text-muted-foreground",
				)}
			/>
			{focused && (
				<span className="absolute top-1 right-2 font-bold text-xs">
					<span aria-hidden="true">{left}</span>
					<span className="sr-only">{left} caracteres restantes</span>
				</span>
			)}
			<button
				type="button"
				ref={(element) => {
					setActivatorNodeRef(element);
					handleRef(element);
				}}
				aria-label={`Mover ${name}`}
				{...attributes}
				{...listeners}
				onKeyDown={(event) => {
					if (onMoveKey(event.key)) {
						event.preventDefault();
					}
				}}
				className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
			>
				<EqualIcon className="size-5" />
			</button>
		</li>
	);
}

/** The field as it follows the pointer: its own color, a little aside (spec 033, RN-05). */
function DraggedAnswer({
	index,
	text,
}: {
	index: number;
	text: string | null;
}) {
	const shape = answerShapeAt(index);
	return (
		<div
			className={cn(
				"flex min-h-16 translate-x-4 items-center gap-2 rounded-md py-2 pr-2 pl-4 font-bold shadow-lg sm:min-h-[clamp(4.5rem,11svh,7rem)] xl:text-lg",
				text
					? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
					: "bg-card text-muted-foreground",
			)}
		>
			<span className="min-w-0 flex-1 truncate">
				{text ?? placeholderOf(index, 4)}
			</span>
			<EqualIcon className="mx-2.5 size-5" />
		</div>
	);
}
