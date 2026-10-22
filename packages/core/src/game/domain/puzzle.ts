import type { GameChoice, GameQuestion } from "./game-question";

/** The texts of the answers in the order of the ids; an unknown id has none. */
export function puzzleTexts(
	question: GameQuestion,
	ids: readonly string[],
): string[] {
	const textOf = new Map(question.choices.map(({ id, text }) => [id, text]));
	return ids.flatMap((id) => {
		const text = textOf.get(id);
		return text === undefined ? [] : [text];
	});
}

/**
 * Right only when, at every position, the text is the right one (spec 033,
 * RN-16): answers with the same text may swap places (RN-09).
 */
export function isRightOrder(
	question: GameQuestion,
	ids: readonly string[],
): boolean {
	const sent = puzzleTexts(question, ids);
	const right = puzzleTexts(question, question.correctOrder);
	return (
		ids.length === question.correctOrder.length &&
		sent.length === right.length &&
		sent.every((text, index) => text === right[index])
	);
}

/**
 * The order a puzzle is played in (spec 033, RN-14): the draw, or, when it
 * came out right, the draw turned by one place. Up to four texts that stay the
 * same when turned are all equal, and those have no wrong order: they keep the
 * editor's.
 */
export function wrongOrderOf(
	question: GameQuestion,
	shuffle: <T>(items: readonly T[]) => T[],
): string[] {
	const drawn = shuffle(question.correctOrder);
	if (!isRightOrder(question, drawn)) {
		return drawn;
	}
	const turned = [...drawn.slice(1), ...drawn.slice(0, 1)];
	return isRightOrder(question, turned) ? [...question.correctOrder] : turned;
}

/**
 * The answers in `order`, each with the color and shape of its place (spec
 * 033, RN-15).
 */
export function placedInOrder(
	question: GameQuestion,
	order: readonly string[],
): GameChoice[] {
	const byId = new Map(question.choices.map((choice) => [choice.id, choice]));
	return order
		.flatMap((id) => {
			const choice = byId.get(id);
			return choice ? [choice] : [];
		})
		.map((choice, shapeIndex) => ({ ...choice, shapeIndex }));
}
