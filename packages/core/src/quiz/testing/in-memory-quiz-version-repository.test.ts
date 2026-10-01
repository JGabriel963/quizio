import { describe, expect, it } from "vitest";

import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "./a-question";
import { InMemoryQuizVersionRepository } from "./in-memory-quiz-version-repository";

const now = new Date("2026-06-01T12:00:00.000Z");
const versionOf = (quizId: string, number: number, text = "Capital?") =>
	newQuizVersion({
		quizId,
		number,
		questions: [aQuestion({ text })],
		now,
	});

describe("InMemoryQuizVersionRepository", () => {
	it("finds a version by quiz and number", async () => {
		const versions = new InMemoryQuizVersionRepository();
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-1", 2, "Outra?"));
		await versions.save(versionOf("quiz-2", 1));

		expect(await versions.find("quiz-1", 2)).toEqual(
			versionOf("quiz-1", 2, "Outra?"),
		);
		expect(await versions.find("quiz-1", 3)).toBeNull();
		expect(await versions.find("quiz-3", 1)).toBeNull();
		expect(versions.allOf("quiz-1").map(({ number }) => number)).toEqual([
			1, 2,
		]);
	});

	it("replaces a version of the same number", async () => {
		const versions = new InMemoryQuizVersionRepository();
		await versions.save(versionOf("quiz-1", 1));

		await versions.save(versionOf("quiz-1", 1, "Outra?"));

		expect(versions.allOf("quiz-1")).toEqual([
			versionOf("quiz-1", 1, "Outra?"),
		]);
	});

	it("deletes every version of a quiz", async () => {
		const versions = new InMemoryQuizVersionRepository();
		await versions.save(versionOf("quiz-1", 1));
		await versions.save(versionOf("quiz-1", 2));
		await versions.save(versionOf("quiz-2", 1));

		await versions.deleteAllOfQuiz("quiz-1");

		expect(versions.allOf("quiz-1")).toEqual([]);
		expect(versions.allOf("quiz-2")).toHaveLength(1);
	});
});
