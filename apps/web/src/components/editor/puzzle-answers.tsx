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
import type { AnswerImage as StoredAnswerImage } from "@quizio/core/quiz/domain/answer-image";
import {
	CHOICE_TEXT_MAX_LENGTH,
	type PuzzleQuestion,
} from "@quizio/core/quiz/domain/question";
import {
	applyQuestionChange,
	type QuestionChange,
} from "@quizio/core/quiz/domain/question-change";
import {
	sameTextFormatting,
	type TextFormatting,
} from "@quizio/core/shared/domain/text-formatting";
import { characterCount } from "@quizio/core/shared/domain/text-length";
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
	AnswerImage,
	type AnswerImageShown,
	answerImageLabel,
} from "@/components/quiz/answer-image";
import { FormattedText } from "@/components/quiz/formatted-text";
import {
	BLOCK_SCREEN_READER_INSTRUCTIONS,
	blockAnnouncements,
	blockMovedAnnouncement,
	keyboardMoveTarget,
	useBlockSensors,
} from "@/lib/sortable";
import { useDebouncedAutosave } from "@/lib/use-debounced-autosave";

import {
	AddAnswerImageButton,
	type AnswerImageActions,
	AnswerImageField,
} from "./answer-image-field";
import { FormattedTextField, type SavedText } from "./formatted-text-field";

/** A slot's field as the list reaches it: what it holds typed and its pending save. */
interface SlotField {
	flush: () => Promise<void>;
	value: () => SavedText;
}

/** The slots' texts, formattings and images, as a move leaves them (specs 048, 049). */
interface Slots {
	items: (string | null)[];
	itemFormatting: TextFormatting[];
	itemImages: (StoredAnswerImage | null)[];
}

function sameSlots(a: Slots, b: Slots): boolean {
	return (
		a.items.length === b.items.length &&
		a.items.every((item, index) => item === b.items[index]) &&
		a.itemImages.every(
			(image, index) => image?.key === (b.itemImages[index] ?? null)?.key,
		) &&
		a.itemFormatting.every((formatting, index) =>
			sameTextFormatting(formatting, b.itemFormatting[index] ?? {}),
		)
	);
}

/** Under a puzzle's answers in the editor (spec 033, RN-06). */
export const PUZZLE_EDITOR_HINT =
	"Adicione no mínimo 3 respostas na ordem correta. Elas serão embaralhadas automaticamente durante o jogo.";

const slotId = (index: number) => `slot-${index}`;
const slotIndex = (id: string | number) => Number(String(id).slice(5));

/** What a slot's field holds, as it is saved: blank is null, with none. */
function savedOf({
	text,
	formatting,
}: {
	text: string;
	formatting: TextFormatting;
}): SavedText {
	return text.trim() === ""
		? { text: null, formatting: {} }
		: { text, formatting };
}

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
	answerImages,
}: {
	question: PuzzleQuestion;
	/** The autosaved text of a slot, with its formatting (spec 048). */
	onSaveItem: (index: number, item: SavedText) => Promise<unknown>;
	onChange: (change: QuestionChange) => void;
	/** Images in the slots (spec 049); none in tests that do not need them. */
	answerImages?: AnswerImageActions;
}) {
	const sensors = useBlockSensors();
	const fields = useRef(new Map<number, SlotField>());
	// A move rewrites the slots: the fields start over from the moved texts.
	const [generation, setGeneration] = useState(0);
	// The moved texts, until the question brings them: the editor's cache
	// may reach this screen a render after the move.
	const [moved, setMoved] = useState<Slots | null>(null);
	const items = moved?.items ?? question.items;
	const itemFormatting = moved?.itemFormatting ?? question.itemFormatting;
	const itemImages = moved?.itemImages ?? question.itemImages;
	const [dragged, setDragged] = useState<number | null>(null);
	const draggedImage = dragged === null ? null : (itemImages[dragged] ?? null);
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
		if (moved && !sameSlots(moved, question)) {
			setGeneration((value) => value + 1);
		}
		setMoved(null);
	}, [question, moved]);

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
		// What the fields show, typed texts and their formatting included.
		const shown = items.map(
			(item, index) =>
				fields.current.get(index)?.value() ?? {
					text: item,
					formatting: itemFormatting[index] ?? {},
				},
		);
		// Texts still waiting go first, so none is written to the wrong place.
		for (const field of fields.current.values()) {
			void field.flush();
		}
		const change: QuestionChange = { kind: "puzzleItemMoved", from, to };
		onChange(change);
		const after = applyQuestionChange(
			{
				...question,
				items: shown.map(({ text }) => text),
				itemFormatting: shown.map(({ formatting }) => formatting),
			},
			change,
		).question as PuzzleQuestion;
		setMoved({
			items: after.items,
			itemFormatting: after.itemFormatting,
			itemImages: after.itemImages,
		});
		setGeneration((current) => current + 1);
	};

	const blocks = items.map((text, index) => ({
		id: slotId(index),
		label: text ?? itemImages[index]?.altText ?? null,
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
			{/* One grid for both lists, so a shape grows with the answer beside it. */}
			{/* Every row as tall as the tallest, as in Kahoot (spec 049). */}
			<div className="grid auto-rows-fr grid-cols-[auto_1fr] gap-2">
				<ol
					aria-hidden="true"
					className="grid grid-rows-subgrid"
					style={{ gridRow: `span ${items.length}` }}
				>
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
							className="grid grid-rows-subgrid"
							style={{ gridRow: `span ${items.length}` }}
						>
							{items.map((text, index) => (
								<PuzzleAnswerField
									// A new field when the slot turns into an image or back (RN-07, RN-13).
									key={`${question.id}:${generation}:${slotId(index)}:${itemImages[index] ? "image" : "text"}`}
									questionId={question.id}
									index={index}
									count={items.length}
									text={text}
									formatting={itemFormatting[index] ?? {}}
									image={itemImages[index] ?? null}
									imageUrl={(key) => answerImages?.urlOf(key) ?? null}
									onPickImage={
										answerImages && (() => answerImages.pick({ slot: index }))
									}
									onImageChange={onChange}
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
							<DraggedAnswer
								index={dragged}
								text={items[dragged] ?? null}
								formatting={itemFormatting[dragged] ?? {}}
								image={
									draggedImage && {
										url: answerImages?.urlOf(draggedImage.key) ?? null,
										crop: draggedImage.crop,
										altText: draggedImage.altText,
									}
								}
							/>
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
	formatting,
	image,
	imageUrl,
	onPickImage,
	onImageChange,
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
	formatting: TextFormatting;
	/** The slot as an image (spec 049). */
	image: StoredAnswerImage | null;
	imageUrl: (key: string) => string | null;
	onPickImage?: () => void;
	onImageChange: (change: QuestionChange) => void;
	/** Its copy follows the pointer while it is dragged. */
	hidden: boolean;
	onSave: (item: SavedText) => Promise<unknown>;
	registerField: (index: number, field: SlotField | null) => void;
	handleRef: (element: HTMLButtonElement | null) => void;
	/** ↑ or ↓ on the handle; true when it moved. */
	onMoveKey: (key: string) => boolean;
}) {
	const [focused, setFocused] = useState(false);
	const { value, setValue, flush } = useDebouncedAutosave({
		key: `question:${questionId}:puzzle:${index}`,
		initialValue: { text: text ?? "", formatting },
		save: (typed) => onSave(savedOf(typed)),
	});
	const typed = useRef(value);
	typed.current = value;
	useEffect(() => {
		registerField(index, {
			flush,
			value: () => savedOf(typed.current),
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
	const filled = image !== null || value.text.trim() !== "";
	const shape = answerShapeAt(index);
	const left = CHOICE_TEXT_MAX_LENGTH - characterCount(value.text);
	const name = value.text.trim() || image?.altText || `resposta ${index + 1}`;
	const answer = { slot: index };
	// A text still on its way goes first: the image then replaces it (RN-07).
	const pickImage = onPickImage && (() => void flush().then(onPickImage));

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
			{image ? (
				<AnswerImageField
					image={image}
					url={imageUrl(image.key)}
					label={`Resposta ${index + 1}`}
					onRemove={() =>
						onImageChange({ kind: "answerImage", answer, key: null })
					}
					onCrop={(crop) =>
						onImageChange({ kind: "answerImageCrop", answer, crop })
					}
					onAltText={(altText) =>
						onImageChange({ kind: "answerImageAltText", answer, altText })
					}
				/>
			) : (
				<FormattedTextField
					initialValue={{ text: text ?? "", formatting }}
					maxLength={CHOICE_TEXT_MAX_LENGTH}
					placeholder={placeholderOf(index, count)}
					label={`Resposta ${index + 1}`}
					toolbarLabel={`Formatação da resposta ${index + 1}`}
					// One column: only the first answer's bar goes above (spec 048, RN-01a).
					toolbarClassName={index === 0 ? undefined : "top-full mt-2"}
					className="flex-1"
					fieldClassName="wrap-break-word font-normal xl:text-lg outline-none"
					onChange={setValue}
					onFocusChange={setFocused}
					onBlur={() => void flush()}
					onImage={pickImage}
				/>
			)}
			{!filled && !focused && pickImage && (
				<AddAnswerImageButton position={index + 1} onClick={pickImage} />
			)}
			{focused && !image && (
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
export function DraggedAnswer({
	index,
	text,
	formatting,
	image = null,
}: {
	index: number;
	text: string | null;
	formatting: TextFormatting;
	/** The slot's image, which moves with it (spec 049, RN-15). */
	image?: AnswerImageShown | null;
}) {
	const shape = answerShapeAt(index);
	return (
		<div
			className={cn(
				"flex min-h-16 translate-x-4 items-center gap-2 rounded-md py-2 pr-2 pl-4 shadow-lg sm:min-h-[clamp(4.5rem,11svh,7rem)] xl:text-lg",
				text || image
					? [ANSWER_COLOR_CLASSES[shape], "text-answer-foreground"]
					: "bg-card text-muted-foreground",
			)}
		>
			<span className="wrap-break-word flex min-w-0 flex-1">
				{image ? (
					<AnswerImage
						image={image}
						label={answerImageLabel(index)}
						className="h-16 justify-start"
					/>
				) : text === null ? (
					placeholderOf(index, 4)
				) : (
					<FormattedText text={text} formatting={formatting} />
				)}
			</span>
			<EqualIcon className="mx-2.5 size-5" />
		</div>
	);
}
