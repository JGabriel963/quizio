import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import {
	ChoiceTextTooLongError,
	InvalidQuestionPointsError,
	InvalidSelectionModeError,
	InvalidTimeLimitError,
	QuestionTextTooLongError,
} from "../domain/question";
import {
	EmptyChoiceCannotBeCorrectError,
	InvalidChoiceCountError,
} from "../domain/question-change";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createRestoreQuestion,
	type RestoreQuestion,
} from "./restore-question";

describe("restoreQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let restoreQuestion: RestoreQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };
	const b = aQuestion({
		id: "b",
		text: "B",
		selection: "multiple",
		timeLimitSeconds: 45,
		points: "double",
		choices: [
			{ id: "choice-1", text: "Brasília", correct: true },
			{ id: "choice-2", text: "Rio", correct: true },
			{ id: "choice-3", text: null, correct: false },
			{ id: "choice-4", text: null, correct: false },
		],
	});

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		restoreQuestion = createRestoreQuestion({ quizzes, questions, clock });
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "c" }),
		]);
	});

	const storedIds = () => questions.listOf("quiz-1").map(({ id }) => id);

	it("puts the question back at its index", async () => {
		const result = await restoreQuestion({ ...ref, question: b, index: 1 });

		expect(result).toEqual({ index: 1 });
		expect(storedIds()).toEqual(["a", "b", "c"]);
		expect(questions.listOf("quiz-1")[1]).toEqual(b);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("a repeated restore is a no-op", async () => {
		await restoreQuestion({ ...ref, question: b, index: 1 });

		const again = await restoreQuestion({ ...ref, question: b, index: 0 });

		expect(again).toEqual({ index: 1 });
		expect(storedIds()).toEqual(["a", "b", "c"]);
	});

	it("revalidates the restored text", async () => {
		await expect(
			restoreQuestion({
				...ref,
				question: { ...b, text: "a".repeat(121) },
				index: 1,
			}),
		).rejects.toThrow(QuestionTextTooLongError);
		expect(storedIds()).toEqual(["a", "c"]);
	});

	it.each([
		[
			"a time outside the list",
			{ timeLimitSeconds: 25 },
			InvalidTimeLimitError,
		],
		["unknown points", { points: "triple" }, InvalidQuestionPointsError],
		[
			"an answer over 75 characters",
			{
				choices: b.choices.map((choice, index) =>
					index === 0 ? { ...choice, text: "a".repeat(76) } : choice,
				),
			},
			ChoiceTextTooLongError,
		],
		[
			"an empty correct answer",
			{
				choices: b.choices.map((choice, index) =>
					index === 2 ? { ...choice, correct: true } : choice,
				),
			},
			EmptyChoiceCannotBeCorrectError,
		],
		[
			"five answer slots",
			{ choices: b.choices.concat(b.choices[3] as never) },
			InvalidChoiceCountError,
		],
		[
			"two corrects in single selection",
			{ selection: "single" },
			InvalidSelectionModeError,
		],
	])("refuses %s", async (_, override, error) => {
		await expect(
			restoreQuestion({
				...ref,
				question: { ...b, ...override } as never,
				index: 1,
			}),
		).rejects.toThrow(error);
		expect(storedIds()).toEqual(["a", "c"]);
	});

	it("ignores the sent answer ids and uses the positions", async () => {
		await restoreQuestion({
			...ref,
			question: {
				...b,
				choices: b.choices.map((choice) => ({ ...choice, id: "x" })),
			},
			index: 1,
		});

		expect(questions.listOf("quiz-1")[1]?.choices.map(({ id }) => id)).toEqual([
			"choice-1",
			"choice-2",
			"choice-3",
			"choice-4",
		]);
	});
});
