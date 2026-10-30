import type { TextFormatting } from "../../shared/domain/text-formatting";
import {
	type AnswerImageOf,
	type ReportAnswer,
	type ReportAnswerImage,
	type ReportQuestion,
	withoutAddress,
} from "./report-game";

/**
 * A puzzle's answer as an order shows it: its text and its formatting (spec
 * 048), or its image (spec 049).
 */
export interface OrderedAnswer {
	text: string | null;
	textFormatting: TextFormatting;
	image: ReportAnswerImage | null;
}

/** A puzzle's answers in its report (spec 033, RN-31). */
export interface PuzzleAnswersView {
	/** The right order, each answer with the color and shape it had in the game. */
	correctOrder: (OrderedAnswer & { shapeIndex: number })[];
	/**
	 * One per order sent, by its texts: answers with the same text in each
	 * other's place are the same order, drawn as the first one sent (spec 048,
	 * RN-12). The right one first, then the most sent.
	 */
	orders: { answers: OrderedAnswer[]; count: number; correct: boolean }[];
}

function answersOf(
	question: ReportQuestion,
	ids: readonly string[],
	imageOf: AnswerImageOf,
): OrderedAnswer[] {
	const byId = new Map(question.choices.map((choice) => [choice.id, choice]));
	return ids.flatMap((id) => {
		const choice = byId.get(id);
		return choice === undefined
			? []
			: [
					{
						text: choice.text,
						textFormatting: choice.textFormatting,
						image: choice.image && imageOf(choice.image),
					},
				];
	});
}

/** The same answer is the same text, or the same image file (spec 049, RN-24). */
function identityOf(question: ReportQuestion, ids: readonly string[]): string {
	const byId = new Map(question.choices.map((choice) => [choice.id, choice]));
	return JSON.stringify(
		ids.flatMap((id) => {
			const choice = byId.get(id);
			if (!choice) {
				return [];
			}
			return [
				choice.image ? `image:${choice.image.key}` : `text:${choice.text}`,
			];
		}),
	);
}

export function puzzleAnswersOf(
	question: ReportQuestion,
	answers: readonly Pick<ReportAnswer, "choiceIds" | "correctness">[],
	imageOf: AnswerImageOf = withoutAddress,
): PuzzleAnswersView | null {
	if (question.type !== "puzzle") {
		return null;
	}
	const shapeOf = new Map(
		question.choices.map(({ id, shapeIndex }) => [id, shapeIndex]),
	);
	const byTexts = new Map<
		string,
		{ answers: OrderedAnswer[]; count: number; correct: boolean }
	>();
	for (const { choiceIds, correctness } of answers) {
		const key = identityOf(question, choiceIds);
		const entry = byTexts.get(key);
		byTexts.set(key, {
			answers: entry?.answers ?? answersOf(question, choiceIds, imageOf),
			count: (entry?.count ?? 0) + 1,
			correct: correctness === "correct",
		});
	}
	return {
		correctOrder: question.correctOrder.flatMap((id) => {
			const [answer] = answersOf(question, [id], imageOf);
			const shapeIndex = shapeOf.get(id);
			return answer === undefined || shapeIndex === undefined
				? []
				: [{ ...answer, shapeIndex }];
		}),
		orders: [...byTexts.values()].sort(
			(a, b) => Number(b.correct) - Number(a.correct) || b.count - a.count,
		),
	};
}

/** The answers a participant sent for a puzzle, in their order; null otherwise. */
export function puzzleOrderOf(
	question: ReportQuestion,
	answer: Pick<ReportAnswer, "choiceIds"> | undefined,
	imageOf: AnswerImageOf = withoutAddress,
): OrderedAnswer[] | null {
	return question.type === "puzzle" && answer
		? answersOf(question, answer.choiceIds, imageOf)
		: null;
}
