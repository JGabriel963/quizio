import {
	type Announcements,
	MouseSensor,
	type ScreenReaderInstructions,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";

/** A block of a sortable list, named for screen readers; null names it by position. */
export interface SortableBlock {
	id: string;
	label: string | null;
}

/**
 * The pointer moves a block after a few pixels; a touch holds a moment first,
 * so a swipe still scrolls the page. The keyboard is the handle's own: ↑ and ↓
 * move one place at once (`blockMovedAnnouncement`).
 */
export function useBlockSensors() {
	return useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 150, tolerance: 5 },
		}),
	);
}

/** What a screen reader hears after ↑ or ↓ moved a block (spec 033, RN-32). */
export function blockMovedAnnouncement(
	name: string,
	position: number,
	total: number,
): string {
	return `${name} movido para a posição ${position} de ${total}.`;
}

/** The place ↑ or ↓ takes a block to, or null at an end or for another key. */
export function keyboardMoveTarget(
	key: string,
	index: number,
	total: number,
): number | null {
	const to =
		key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : null;
	return to === null || to < 0 || to >= total ? null : to;
}

/** What a screen reader says while a block moves (spec 033, RN-32). */
export function blockAnnouncements(
	blocks: readonly SortableBlock[],
): Required<Announcements> {
	const total = blocks.length;
	const positionOf = (id: string | number) =>
		blocks.findIndex((block) => block.id === id) + 1;
	const nameOf = (id: string | number) => {
		const block = blocks.find((candidate) => candidate.id === id);
		return block?.label ?? `Bloco ${positionOf(id)}`;
	};
	return {
		onDragStart: ({ active }) =>
			`${nameOf(active.id)} pego, posição ${positionOf(active.id)} de ${total}.`,
		onDragMove: () => undefined,
		onDragOver: ({ active, over }) =>
			over
				? `${nameOf(active.id)} sobre a posição ${positionOf(over.id)} de ${total}.`
				: undefined,
		onDragEnd: ({ active, over }) =>
			over
				? `${nameOf(active.id)} solto na posição ${positionOf(over.id)} de ${total}.`
				: `${nameOf(active.id)} solto.`,
		onDragCancel: ({ active }) =>
			`Movimento cancelado. ${nameOf(active.id)} voltou à posição ${positionOf(active.id)} de ${total}.`,
	};
}

export const BLOCK_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
	draggable: "Para mover o bloco, use as setas para cima e para baixo.",
};

/** The ids with `activeId` taken to `overId`'s place; the ones between shift by one. */
export function moveBlock(
	ids: readonly string[],
	activeId: string,
	overId: string,
): string[] {
	const from = ids.indexOf(activeId);
	const to = ids.indexOf(overId);
	if (from === -1 || to === -1 || from === to) {
		return [...ids];
	}
	const moved = [...ids];
	moved.splice(from, 1);
	moved.splice(to, 0, activeId);
	return moved;
}
