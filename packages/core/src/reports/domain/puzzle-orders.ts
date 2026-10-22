import type { ReportAnswer, ReportQuestion } from "./report-game";

/** A puzzle's answers in its report (spec 033, RN-31). */
export interface PuzzleAnswersView {
	/** The right order, each answer with the color and shape it had in the game. */
	correctOrder: { text: string; shapeIndex: number }[];
	/**
	 * One per order sent, by its texts: answers with the same text in each
	 * other's place are the same order. The right one first, then the most sent.
	 */
	orders: { texts: string[]; count: number; correct: boolean }[];
}

function textsOf(question: ReportQuestion, ids: readonly string[]): string[] {
	const textOf = new Map(question.choices.map(({ id, text }) => [id, text]));
	return ids.flatMap((id) => {
		const text = textOf.get(id);
		return text === undefined ? [] : [text];
	});
}

export function puzzleAnswersOf(
	question: ReportQuestion,
	answers: readonly Pick<ReportAnswer, "choiceIds" | "correctness">[],
): PuzzleAnswersView | null {
	if (question.type !== "puzzle") {
		return null;
	}
	const shapeOf = new Map(
		question.choices.map(({ id, shapeIndex }) => [id, shapeIndex]),
	);
	const byTexts = new Map<
		string,
		{ texts: string[]; count: number; correct: boolean }
	>();
	for (const { choiceIds, correctness } of answers) {
		const texts = textsOf(question, choiceIds);
		const key = JSON.stringify(texts);
		const entry = byTexts.get(key);
		byTexts.set(key, {
			texts,
			count: (entry?.count ?? 0) + 1,
			correct: correctness === "correct",
		});
	}
	return {
		correctOrder: question.correctOrder.flatMap((id) => {
			const [text] = textsOf(question, [id]);
			const shapeIndex = shapeOf.get(id);
			return text === undefined || shapeIndex === undefined
				? []
				: [{ text, shapeIndex }];
		}),
		orders: [...byTexts.values()].sort(
			(a, b) => Number(b.correct) - Number(a.correct) || b.count - a.count,
		),
	};
}

/** The texts a participant sent for a puzzle, in their order; null otherwise. */
export function puzzleOrderOf(
	question: ReportQuestion,
	answer: Pick<ReportAnswer, "choiceIds"> | undefined,
): string[] | null {
	return question.type === "puzzle" && answer
		? textsOf(question, answer.choiceIds)
		: null;
}
