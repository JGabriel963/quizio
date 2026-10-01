import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InvalidTimeLimitError } from "../domain/question";
import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import {
	type ApplyTimeLimitToAll,
	createApplyTimeLimitToAll,
} from "./apply-time-limit-to-all";

describe("applyTimeLimitToAll", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let applyTimeLimitToAll: ApplyTimeLimitToAll;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		applyTimeLimitToAll = createApplyTimeLimitToAll({
			quizzes,
			questions,
			versions: new InMemoryQuizVersionRepository(),
			clock: new FixedClock("2026-06-01T12:00:00.000Z"),
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a", timeLimitSeconds: 45 }),
			aQuestion({ id: "b", points: "double" }),
			aQuestion({ id: "c" }),
		]);
	});

	it("sets every question's time and returns the count", async () => {
		const result = await applyTimeLimitToAll({ ...ref, seconds: 45 });

		expect(result).toEqual({ updatedCount: 3 });
		const stored = questions.listOf("quiz-1");
		expect(stored.map((question) => question.timeLimitSeconds)).toEqual([
			45, 45, 45,
		]);
		expect(stored.map(({ id }) => id)).toEqual(["a", "b", "c"]);
		expect(stored[1]?.points).toBe("double");
	});

	it("applies to questions of every type", async () => {
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aTrueFalseQuestion({ id: "tf-1", correct: true }),
			aTrueFalseQuestion({ id: "tf-2" }),
		]);

		const result = await applyTimeLimitToAll({ ...ref, seconds: 45 });

		expect(result).toEqual({ updatedCount: 3 });
		expect(questions.listOf("quiz-1")).toEqual([
			aQuestion({ id: "a", timeLimitSeconds: 45 }),
			aTrueFalseQuestion({ id: "tf-1", correct: true, timeLimitSeconds: 45 }),
			aTrueFalseQuestion({ id: "tf-2", timeLimitSeconds: 45 }),
		]);
	});

	it("refuses an invalid time", async () => {
		await expect(applyTimeLimitToAll({ ...ref, seconds: 25 })).rejects.toThrow(
			InvalidTimeLimitError,
		);
		expect(questions.listOf("quiz-1")[1]?.timeLimitSeconds).toBe(20);
	});
});
