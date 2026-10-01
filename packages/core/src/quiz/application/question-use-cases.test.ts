import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createAddQuestion } from "./add-question";
import { createApplyTimeLimitToAll } from "./apply-time-limit-to-all";
import { createDeleteQuestion } from "./delete-question";
import { createDuplicateQuestion } from "./duplicate-question";
import { createMoveQuestion } from "./move-question";
import type { QuizReference } from "./quiz-reference";
import { createRenameQuiz } from "./rename-quiz";
import { createUpdateQuestion } from "./update-question";

/** Rules every editor operation shares (spec 003, RN-02, RN-03, RN-24). */
async function setUp(quizOverrides: Parameters<typeof aQuiz>[0] = {}) {
	const quizzes = new InMemoryQuizRepository();
	const questions = new InMemoryQuestionRepository();
	const versions = new InMemoryQuizVersionRepository();
	const clock = new FixedClock("2026-06-01T12:00:00.000Z");
	const deps = {
		quizzes,
		questions,
		versions,
		clock,
		ids: new SequentialIdGenerator("new"),
		storage: new InMemoryObjectStorage("https://media.test"),
	};
	const quiz = aQuiz(quizOverrides);
	// Different texts, so moving one is a change of content.
	const list = [aQuestion({ id: "a" }), aQuestion({ id: "b", text: "B" })];
	await quizzes.save(quiz);
	await questions.saveList("quiz-1", list);
	if (quiz.publishedVersion !== null) {
		await versions.save(
			newQuizVersion({
				quizId: quiz.id,
				number: quiz.publishedVersion,
				questions: list,
				now: quiz.createdAt,
			}),
		);
	}
	return { quizzes, questions, clock, deps };
}

type Deps = Awaited<ReturnType<typeof setUp>>["deps"];

const operations: [
	string,
	(deps: Deps, ref: QuizReference) => Promise<unknown>,
][] = [
	[
		"add",
		(deps, ref) =>
			createAddQuestion(deps)({ ...ref, afterQuestionId: "a", type: "quiz" }),
	],
	[
		"duplicate",
		(deps, ref) => createDuplicateQuestion(deps)({ ...ref, questionId: "a" }),
	],
	[
		"move",
		(deps, ref) =>
			createMoveQuestion(deps)({ ...ref, questionId: "b", toIndex: 0 }),
	],
	[
		"delete",
		(deps, ref) => createDeleteQuestion(deps)({ ...ref, questionId: "b" }),
	],

	[
		"update",
		(deps, ref) =>
			createUpdateQuestion(deps)({
				...ref,
				questionId: "a",
				change: { kind: "text", text: "Novo" },
			}),
	],
	[
		"applyTimeLimitToAll",
		(deps, ref) => createApplyTimeLimitToAll(deps)({ ...ref, seconds: 45 }),
	],
	[
		"rename",
		(deps, ref) => createRenameQuiz(deps)({ ...ref, title: "Novo título" }),
	],
];

describe.each(operations)("editor operation %s", (name, run) => {
	it("hides foreign quizzes behind QuizNotFoundError", async () => {
		const { deps, questions } = await setUp({ ownerId: "user-2" });

		await expect(
			run(deps, { ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		expect(questions.listOf("quiz-1").map(({ id }) => id)).toEqual(["a", "b"]);
	});

	it("refuses a trashed quiz", async () => {
		const { deps } = await setUp({
			trashedAt: new Date("2026-02-01T10:00:00.000Z"),
		});

		await expect(
			run(deps, { ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizInTrashError);
	});

	it("sets updatedAt to now", async () => {
		const { deps, quizzes, clock } = await setUp();

		await run(deps, { ownerId: "user-1", quizId: "quiz-1" });

		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("never marks a draft as changed", async () => {
		const { deps, quizzes } = await setUp();

		await run(deps, { ownerId: "user-1", quizId: "quiz-1" });

		expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
			false,
		);
	});

	// Every list change marks the quiz; its title is not part of the version
	// (spec 006, RN-06, RN-19).
	it("marks a published quiz as changed, unless only its title changed", async () => {
		const { deps, quizzes } = await setUp(aPublishedQuiz());

		await run(deps, { ownerId: "user-1", quizId: "quiz-1" });

		expect(await quizzes.findById("quiz-1")).toMatchObject({
			status: "published",
			publishedVersion: 1,
			hasUnpublishedChanges: name !== "rename",
		});
	});
});
