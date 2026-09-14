import { describe, expect, it } from "vitest";

import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	assertPermanentlyDeletable,
	changeQuizDetails,
	copyQuiz,
	newQuiz,
	type Quiz,
	QuizInTrashError,
	QuizNotFoundError,
	QuizNotInTrashError,
	requireOwnedQuiz,
	restoreQuiz,
	trashQuiz,
} from "./quiz";

const createdAt = new Date("2026-01-01T10:00:00.000Z");
const oneDayLater = new Date("2026-01-02T10:00:00.000Z");
const twoDaysLater = new Date("2026-01-03T10:00:00.000Z");

function aQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return {
		...newQuiz({
			id: "quiz-1",
			ownerId: "user-1",
			details: {
				title: "Bom de Bíblia",
				description: "Atos 1 a 7",
				visibility: "unlisted",
			},
			coverImageKey: "media/user-1/cover.png",
			now: createdAt,
		}),
		...overrides,
	};
}

describe("newQuiz", () => {
	it("creates a draft stamped with the creation time", () => {
		const quiz = newQuiz({
			id: "quiz-1",
			ownerId: "user-1",
			details: { title: null, description: null, visibility: "private" },
			coverImageKey: null,
			now: createdAt,
		});

		expect(quiz).toEqual({
			id: "quiz-1",
			ownerId: "user-1",
			title: null,
			description: null,
			coverImageKey: null,
			visibility: "private",
			status: "draft",
			createdAt,
			updatedAt: createdAt,
			trashedAt: null,
		});
	});
});

describe("changeQuizDetails", () => {
	it("replaces details and cover and bumps updatedAt", () => {
		const changed = changeQuizDetails(
			aQuiz(),
			{
				details: {
					title: "Geografia",
					description: null,
					visibility: "private",
				},
				coverImageKey: null,
			},
			oneDayLater,
		);

		expect(changed).toMatchObject({
			title: "Geografia",
			description: null,
			visibility: "private",
			coverImageKey: null,
			createdAt,
			updatedAt: oneDayLater,
		});
	});

	it("is refused in the trash", () => {
		const trashed = trashQuiz(aQuiz(), oneDayLater);

		expect(() =>
			changeQuizDetails(
				trashed,
				{
					details: { title: "Novo", description: null, visibility: "private" },
					coverImageKey: null,
				},
				twoDaysLater,
			),
		).toThrow(QuizInTrashError);
	});
});

describe("trashQuiz and restoreQuiz", () => {
	it("trashing records trashedAt and keeps updatedAt", () => {
		const trashed = trashQuiz(aQuiz(), oneDayLater);

		expect(trashed.trashedAt).toEqual(oneDayLater);
		expect(trashed.updatedAt).toEqual(createdAt);
	});

	it("trashing is idempotent", () => {
		const trashedTwice = trashQuiz(
			trashQuiz(aQuiz(), oneDayLater),
			twoDaysLater,
		);

		expect(trashedTwice.trashedAt).toEqual(oneDayLater);
	});

	it("restoring clears trashedAt, keeps every other field and is idempotent", () => {
		const original = aQuiz();

		const restored = restoreQuiz(trashQuiz(original, oneDayLater));

		expect(restored).toEqual(original);
		expect(restoreQuiz(restored)).toEqual(original);
	});
});

describe("assertPermanentlyDeletable", () => {
	it("only accepts quizzes in the trash", () => {
		expect(() => assertPermanentlyDeletable(aQuiz())).toThrow(
			QuizNotInTrashError,
		);
		expect(() =>
			assertPermanentlyDeletable(trashQuiz(aQuiz(), oneDayLater)),
		).not.toThrow();
	});
});

describe("copyQuiz", () => {
	it("creates a draft copy with the duplicate title and new identity and timestamps", () => {
		const copy = copyQuiz(aQuiz(), {
			id: "quiz-2",
			coverImageKey: "media/user-1/copy.png",
			now: twoDaysLater,
		});

		expect(copy).toEqual({
			id: "quiz-2",
			ownerId: "user-1",
			title: "Bom de Bíblia (cópia)",
			description: "Atos 1 a 7",
			coverImageKey: "media/user-1/copy.png",
			visibility: "unlisted",
			status: "draft",
			createdAt: twoDaysLater,
			updatedAt: twoDaysLater,
			trashedAt: null,
		});
	});

	it("refuses quizzes in the trash", () => {
		expect(() =>
			copyQuiz(trashQuiz(aQuiz(), oneDayLater), {
				id: "quiz-2",
				coverImageKey: null,
				now: twoDaysLater,
			}),
		).toThrow(QuizInTrashError);
	});
});

describe("requireOwnedQuiz", () => {
	it("returns the quiz to its owner", () => {
		const quiz = aQuiz();

		expect(requireOwnedQuiz(quiz, "user-1")).toBe(quiz);
	});

	it.each([
		["a missing quiz", null],
		["another owner's quiz", aQuiz({ ownerId: "user-2" })],
	])("treats %s as not found", (_, quiz) => {
		const attempt = () => requireOwnedQuiz(quiz, "user-1");

		expect(attempt).toThrow(QuizNotFoundError);
		expect(attempt).toThrow(NotFoundError);
	});
});
