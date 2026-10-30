import type { GameChoice, GameQuestion } from "./game-question";

/** The texts of the answers in the order of the ids; an unknown id has none. */
export function puzzleTexts(
	question: GameQuestion,
	ids: readonly string[],
): (string | null)[] {
	const textOf = new Map(question.choices.map(({ id, text }) => [id, text]));
	return ids.flatMap((id) => {
		const text = textOf.get(id);
		return text === undefined ? [] : [text];
	});
}

/**
 * What makes two answers the same: their text, or the file of their image
 * (spec 049, RN-20). An image is never the same as a text.
 */
export function answerIdentity(
	choice: Pick<GameChoice, "text" | "image">,
): string {
	return choice.image
		? `image:${choice.image.key}`
		: `text:${choice.text ?? ""}`;
}

function identities(question: GameQuestion, ids: readonly string[]): string[] {
	const identityOf = new Map(
		question.choices.map((choice) => [choice.id, answerIdentity(choice)]),
	);
	return ids.flatMap((id) => {
		const identity = identityOf.get(id);
		return identity === undefined ? [] : [identity];
	});
}

/**
 * Right only when, at every position, the answer is the right one (spec 033,
 * RN-16): answers with the same text, or the same image, may swap places
 * (RN-09; spec 049, RN-20).
 */
export function isRightOrder(
	question: GameQuestion,
	ids: readonly string[],
): boolean {
	const sent = identities(question, ids);
	const right = identities(question, question.correctOrder);
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
