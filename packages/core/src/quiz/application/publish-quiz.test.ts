import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { blankQuestion, type Question } from "../domain/question";
import { IncompleteQuestionsError } from "../domain/question-issues";
import {
	QuizInTrashError,
	QuizNotFoundError,
	QuizTitleRequiredError,
} from "../domain/quiz";
import { QuizTitleTooLongError } from "../domain/quiz-details";
import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createPublishQuiz, type PublishQuiz } from "./publish-quiz";

const complete = (id: string, text = "Qual é a capital do Brasil?") =>
	aQuestion({
		id,
		text,
		choices: [
			{ id: "choice-1", text: "Brasília", correct: true },
			{ id: "choice-2", text: "Rio", correct: false },
			{ id: "choice-3", text: null, correct: false },
			{ id: "choice-4", text: null, correct: false },
		],
	});
const trueFalse = aTrueFalseQuestion({ id: "tf", correct: false });

describe("publishQuiz", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let clock: FixedClock;
	let publishQuiz: PublishQuiz;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	async function given(
		list: Question[],
		quiz: Parameters<typeof aQuiz>[0] = {},
	) {
		await quizzes.save(aQuiz(quiz));
		await questions.saveList("quiz-1", list);
	}
	const stored = async () => (await quizzes.findById("quiz-1")) ?? aQuiz();

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		publishQuiz = createPublishQuiz({
			quizzes,
			questions,
			versions,
			storage: new InMemoryObjectStorage("https://media.test"),
			clock,
		});
	});

	it("publishes a complete draft as version 1", async () => {
		await given([complete("a"), trueFalse]);

		const view = await publishQuiz(ref);

		expect(view).toMatchObject({
			status: "published",
			publishedVersion: 1,
			publishedAt: clock.now(),
			hasUnpublishedChanges: false,
			questionCount: 2,
		});
		expect(await stored()).toMatchObject({
			status: "published",
			publishedVersion: 1,
			publishedAt: clock.now(),
		});
		expect(versions.allOf("quiz-1")).toEqual([
			{
				quizId: "quiz-1",
				number: 1,
				questions: [complete("a"), trueFalse],
				createdAt: clock.now(),
			},
		]);
	});

	it("publishing updates the last modification", async () => {
		await given([complete("a")]);

		await publishQuiz(ref);

		expect((await stored()).updatedAt).toEqual(clock.now());
	});

	it("refuses incomplete questions", async () => {
		await given([complete("a"), aTrueFalseQuestion({ id: "tf" })]);

		await expect(publishQuiz(ref)).rejects.toThrow(IncompleteQuestionsError);
		expect((await stored()).status).toBe("draft");
		expect(versions.allOf("quiz-1")).toEqual([]);
	});

	it("refuses a quiz without title", async () => {
		await given([complete("a")], { title: null });

		await expect(publishQuiz(ref)).rejects.toThrow(QuizTitleRequiredError);
		expect((await stored()).status).toBe("draft");
		expect(versions.allOf("quiz-1")).toEqual([]);
	});

	it("refuses incomplete questions before a missing title", async () => {
		await given([blankQuestion("a")], { title: null });

		await expect(publishQuiz(ref)).rejects.toThrow(IncompleteQuestionsError);
	});

	it("applies the finishing touches before publishing", async () => {
		await given([complete("a")], { title: null, description: null });

		const view = await publishQuiz({
			...ref,
			details: {
				title: "  Capitais do mundo ",
				description: "Para a aula de geografia",
			},
		});

		expect(view).toMatchObject({
			title: "Capitais do mundo",
			description: "Para a aula de geografia",
			status: "published",
			publishedVersion: 1,
		});
		expect(await stored()).toMatchObject({
			title: "Capitais do mundo",
			description: "Para a aula de geografia",
		});
	});

	it("refuses finishing touches without a title or over the limits", async () => {
		await given([complete("a")], { title: null });

		await expect(
			publishQuiz({ ...ref, details: { title: "   ", description: null } }),
		).rejects.toThrow(QuizTitleRequiredError);
		await expect(
			publishQuiz({
				...ref,
				details: { title: "a".repeat(96), description: null },
			}),
		).rejects.toThrow(QuizTitleTooLongError);
		expect(await stored()).toMatchObject({ title: null, status: "draft" });
	});

	it("does not keep the finishing touches of a refused publish", async () => {
		await given([blankQuestion("a")], { title: null });

		await expect(
			publishQuiz({
				...ref,
				details: { title: "Capitais", description: null },
			}),
		).rejects.toThrow(IncompleteQuestionsError);

		expect((await stored()).title).toBeNull();
	});

	it("publishing again creates version 2", async () => {
		await given([complete("a")]);
		await publishQuiz(ref);
		const firstPublishedAt = clock.now();
		clock.advanceBy(60_000);
		await questions.saveList("quiz-1", [
			complete("a", "Capital da Argentina?"),
		]);
		await quizzes.save({ ...(await stored()), hasUnpublishedChanges: true });

		const view = await publishQuiz(ref);

		expect(view).toMatchObject({
			publishedVersion: 2,
			publishedAt: clock.now(),
			hasUnpublishedChanges: false,
		});
		expect(versions.allOf("quiz-1")).toMatchObject([
			{
				number: 1,
				createdAt: firstPublishedAt,
				questions: [{ text: "Qual é a capital do Brasil?" }],
			},
			{ number: 2, questions: [{ text: "Capital da Argentina?" }] },
		]);
	});

	it("publishing without changes keeps the version", async () => {
		await given([complete("a")]);
		await publishQuiz(ref);
		const published = await stored();
		clock.advanceBy(60_000);

		const view = await publishQuiz(ref);

		expect(view).toMatchObject({
			publishedVersion: 1,
			publishedAt: published.publishedAt,
		});
		expect(await stored()).toEqual(published);
		expect(versions.allOf("quiz-1")).toHaveLength(1);
	});

	it("a stale changes mark is cleared when the list equals the version", async () => {
		await given([complete("a")]);
		await publishQuiz(ref);
		await quizzes.save({ ...(await stored()), hasUnpublishedChanges: true });

		await publishQuiz(ref);

		expect(await stored()).toMatchObject({
			publishedVersion: 1,
			hasUnpublishedChanges: false,
		});
	});

	it("a published quiz with an incomplete question keeps its version", async () => {
		await given([complete("a")]);
		await publishQuiz(ref);
		await questions.saveList("quiz-1", [complete("a"), blankQuestion("b")]);

		await expect(publishQuiz(ref)).rejects.toThrow(IncompleteQuestionsError);

		expect((await stored()).publishedVersion).toBe(1);
		expect(versions.allOf("quiz-1")).toMatchObject([
			{ number: 1, questions: [{ id: "a" }] },
		]);
	});

	it("freezes a copy: later edits do not reach the version", async () => {
		const live = complete("a");
		await given([live]);
		await publishQuiz(ref);

		live.text = "Mudou";
		(live.choices[0] as { text: string | null }).text = "Mudou";

		expect(versions.allOf("quiz-1")[0]?.questions).toEqual([complete("a")]);
	});

	it("hides other owners' quizzes and refuses trashed ones", async () => {
		await given([complete("a")], {
			trashedAt: new Date("2026-05-01T00:00:00.000Z"),
		});

		await expect(
			publishQuiz({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		await expect(
			publishQuiz({ ownerId: "user-1", quizId: "missing" }),
		).rejects.toThrow(QuizNotFoundError);
		await expect(publishQuiz(ref)).rejects.toThrow(QuizInTrashError);
		expect(versions.allOf("quiz-1")).toEqual([]);
	});
});
