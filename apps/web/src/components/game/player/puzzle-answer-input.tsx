import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import type { AnswerImageShown } from "@/components/quiz/answer-image";
import {
	BLOCK_SCREEN_READER_INSTRUCTIONS,
	blockAnnouncements,
	blockMovedAnnouncement,
	keyboardMoveTarget,
	moveBlock,
	useBlockSensors,
} from "@/lib/sortable";

import { BodyDragOverlay } from "../body-drag-overlay";
import {
	PuzzleBlock,
	PuzzleBlockGrip,
	PuzzleBlockHandle,
} from "../puzzle-block";

interface PuzzleChoice {
	id: string;
	shapeIndex: number;
	/** Null without "Mostrar perguntas nos dispositivos" (RN-20). */
	text: string | null;
	/** Its marked stretches (spec 048, RN-19). */
	textFormatting?: TextFormatting;
	/** An image answer, only when the texts are shown (spec 049, RN-23). */
	image?: AnswerImageShown | null;
}

/**
 * How the blocks take the screen: low strips under the question when it is on
 * the device, as in Kahoot, or sharing the whole screen when the blocks are
 * all there is (RN-20).
 */
export type PuzzleInputSize = "compact" | "fill";

const BLOCK_SIZE: Record<PuzzleInputSize, string> = {
	compact: "min-h-10 text-base",
	fill: "h-full min-h-12 text-xl",
};

/**
 * A puzzle's answer on a device (spec 033, RN-19 to RN-22): the blocks in the
 * order they came, moved by dragging or with ↑ and ↓, each keeping its color
 * and shape; "Enviar" sends the order as it is. `initialOrder` gives back an
 * order that was not sent.
 */
export function PuzzleAnswerInput({
	choices,
	initialOrder,
	size = "compact",
	onSubmit,
}: {
	choices: readonly PuzzleChoice[];
	initialOrder?: readonly string[];
	size?: PuzzleInputSize;
	onSubmit: (choiceIds: string[]) => void;
}) {
	const [order, setOrder] = useState<string[]>(() => {
		const known = new Set(choices.map(({ id }) => id));
		return initialOrder?.length === known.size &&
			initialOrder.every((id) => known.has(id))
			? [...initialOrder]
			: choices.map(({ id }) => id);
	});
	const [announcement, setAnnouncement] = useState("");
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [focusId, setFocusId] = useState<string | null>(null);
	const handles = useRef(new Map<string, HTMLButtonElement>());
	const sensors = useBlockSensors();
	const byId = new Map(choices.map((choice) => [choice.id, choice]));
	const ordered = order.flatMap((id) => {
		const choice = byId.get(id);
		return choice ? [choice] : [];
	});
	const dragged = draggedId === null ? undefined : byId.get(draggedId);
	const nameOf = (choice: PuzzleChoice) =>
		choice.text ?? choice.image?.altText ?? `bloco ${choice.shapeIndex + 1}`;

	useEffect(() => {
		if (focusId !== null) {
			handles.current.get(focusId)?.focus();
			setFocusId(null);
		}
	}, [focusId]);

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		setDraggedId(null);
		if (over) {
			setOrder((current) =>
				moveBlock(current, String(active.id), String(over.id)),
			);
		}
	};

	const moveByKey = (choice: PuzzleChoice, key: string) => {
		const index = order.indexOf(choice.id);
		const to = keyboardMoveTarget(key, index, order.length);
		const target = to === null ? undefined : order[to];
		if (to === null || target === undefined) {
			return false;
		}
		setOrder((current) => moveBlock(current, choice.id, target));
		setAnnouncement(
			blockMovedAnnouncement(nameOf(choice), to + 1, order.length),
		);
		setFocusId(choice.id);
		return true;
	};

	return (
		<form
			className={cn(
				// Apart from the statement above, as in Kahoot.
				"flex w-full flex-col gap-2 px-2 pt-4 pb-2",
				size === "fill" ? "min-h-0 flex-1" : "shrink-0",
			)}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(order);
			}}
		>
			<p className="self-center rounded-sm bg-white/90 px-3 py-1 text-center font-semibold text-neutral-800 text-xs shadow-sm">
				Arraste os blocos para os organizar na ordem certa.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={({ active }) => setDraggedId(String(active.id))}
				onDragEnd={handleDragEnd}
				onDragCancel={() => setDraggedId(null)}
				accessibility={{
					announcements: blockAnnouncements(
						ordered.map((choice) => ({ id: choice.id, label: choice.text })),
					),
					screenReaderInstructions: BLOCK_SCREEN_READER_INSTRUCTIONS,
				}}
			>
				<SortableContext items={order} strategy={verticalListSortingStrategy}>
					<ol
						aria-label="Blocos"
						className={cn(
							"flex flex-col gap-1.5",
							size === "fill" && "min-h-0 flex-1",
						)}
					>
						{ordered.map((choice) => (
							<SortableBlock
								key={choice.id}
								choice={choice}
								name={nameOf(choice)}
								size={size}
								handleRef={(element) => {
									if (element) {
										handles.current.set(choice.id, element);
									} else {
										handles.current.delete(choice.id);
									}
								}}
								onMoveKey={(key) => moveByKey(choice, key)}
							/>
						))}
					</ol>
				</SortableContext>
				<BodyDragOverlay>
					{dragged && (
						<PuzzleBlock
							shapeIndex={dragged.shapeIndex}
							text={dragged.text}
							textFormatting={dragged.textFormatting}
							image={dragged.image}
							className={cn(BLOCK_SIZE[size], "-translate-y-0.5 shadow-lg")}
							end={<PuzzleBlockGrip />}
						/>
					)}
				</BodyDragOverlay>
			</DndContext>
			<p role="status" className="sr-only">
				{announcement}
			</p>
			<Button
				type="submit"
				variant="secondary"
				className="shrink-0 self-center"
			>
				Enviar
			</Button>
		</form>
	);
}

function SortableBlock({
	choice,
	name,
	size,
	handleRef,
	onMoveKey,
}: {
	choice: PuzzleChoice;
	name: string;
	size: PuzzleInputSize;
	handleRef: (element: HTMLButtonElement | null) => void;
	onMoveKey: (key: string) => boolean;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: choice.id });
	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			// Its copy in the overlay follows the finger; its place stays.
			className={cn(
				size === "fill" && "min-h-0 flex-1",
				isDragging && "opacity-0",
			)}
		>
			<PuzzleBlock
				shapeIndex={choice.shapeIndex}
				text={choice.text}
				textFormatting={choice.textFormatting}
				image={choice.image}
				className={BLOCK_SIZE[size]}
				end={
					<PuzzleBlockHandle
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
					/>
				}
			/>
		</li>
	);
}
