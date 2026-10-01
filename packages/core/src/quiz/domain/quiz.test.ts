import { describe, expect, it } from "vitest";

import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	assertPermanentlyDeletable,
	changeQuizDetails,
	copyQuiz,
	markQuizChanges,
	newQuiz,
	publishQuiz,
	type Quiz,
	QuizInTrashError,
	QuizNotFoundError,
	QuizNotInTrashError,
	QuizTitleRequiredError,
	quizPublishState,
	renameQuiz,
	requireOwnedQuiz,
	restoreQuiz,
	touchQuiz,
	trashQuiz,
	withFinishingTouches,
} from "./quiz";
import {
	QuizDescriptionTooLongError,
	QuizTitleTooLongError,
} from "./quiz-details";

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
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
			createdAt,
			updatedAt: createdAt,
			trashedAt: null,
		});
	});
});

describe("publishing", () => {
	const published = () => publishQuiz(aQuiz(), oneDayLater);

	it("publishing numbers the versions", () => {
		expect(published()).toEqual({
			...aQuiz(),
			status: "published",
			publishedVersion: 1,
			publishedAt: oneDayLater,
			hasUnpublishedChanges: false,
			updatedAt: oneDayLater,
		});

		const again = publishQuiz(
			{ ...published(), hasUnpublishedChanges: true },
			twoDaysLater,
		);

		expect(again).toMatchObject({
			status: "published",
			publishedVersion: 2,
			publishedAt: twoDaysLater,
			hasUnpublishedChanges: false,
		});
	});

	it("publishing needs a title", () => {
		expect(() => publishQuiz(aQuiz({ title: null }), oneDayLater)).toThrow(
			QuizTitleRequiredError,
		);
	});

	it("a trashed quiz is not published", () => {
		expect(() =>
			publishQuiz(aQuiz({ trashedAt: oneDayLater }), twoDaysLater),
		).toThrow(QuizInTrashError);
	});

	it("a published quiz keeps its title", () => {
		expect(() => renameQuiz(published(), "  ", twoDaysLater)).toThrow(
			QuizTitleRequiredError,
		);
		expect(() =>
			changeQuizDetails(
				published(),
				{
					details: { title: null, description: null, visibility: "private" },
					coverImageKey: null,
				},
				twoDaysLater,
			),
		).toThrow(QuizTitleRequiredError);
		expect(renameQuiz(published(), "Geografia", twoDaysLater).title).toBe(
			"Geografia",
		);
	});

	it("finishing touches set the title and the description", () => {
		expect(
			withFinishingTouches(aQuiz({ title: null, description: null }), {
				title: "  Capitais do mundo ",
				description: "  Para a aula de geografia ",
			}),
		).toMatchObject({
			title: "Capitais do mundo",
			description: "Para a aula de geografia",
			updatedAt: createdAt,
		});
		expect(() =>
			withFinishingTouches(aQuiz(), {
				title: "a".repeat(96),
				description: null,
			}),
		).toThrow(QuizTitleTooLongError);
		expect(() =>
			withFinishingTouches(aQuiz(), {
				title: "Ok",
				description: "a".repeat(501),
			}),
		).toThrow(QuizDescriptionTooLongError);
	});

	it("only a published quiz has pending changes", () => {
		expect(markQuizChanges(aQuiz(), true, oneDayLater)).toEqual({
			...aQuiz(),
			updatedAt: oneDayLater,
		});
		expect(markQuizChanges(published(), true, twoDaysLater)).toEqual({
			...published(),
			hasUnpublishedChanges: true,
			updatedAt: twoDaysLater,
		});
		expect(
			markQuizChanges(
				{ ...published(), hasUnpublishedChanges: true },
				false,
				twoDaysLater,
			).hasUnpublishedChanges,
		).toBe(false);
	});

	it("publish state of a quiz", () => {
		expect(quizPublishState(aQuiz())).toBe("draft");
		expect(quizPublishState(published())).toBe("published");
		expect(
			quizPublishState({ ...published(), hasUnpublishedChanges: true }),
		).toBe("unpublishedChanges");
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
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
			createdAt: twoDaysLater,
			updatedAt: twoDaysLater,
			trashedAt: null,
		});
	});

	it("a copy is always a draft", () => {
		const source = {
			...publishQuiz(aQuiz(), oneDayLater),
			hasUnpublishedChanges: true,
		};

		expect(
			copyQuiz(source, {
				id: "quiz-2",
				coverImageKey: null,
				now: twoDaysLater,
			}),
		).toMatchObject({
			status: "draft",
			publishedVersion: null,
			publishedAt: null,
			hasUnpublishedChanges: false,
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

describe("touchQuiz", () => {
	it("touching a quiz sets updatedAt to now", () => {
		expect(touchQuiz(aQuiz(), oneDayLater)).toEqual({
			...aQuiz(),
			updatedAt: oneDayLater,
		});
	});

	it("touching a trashed quiz throws QuizInTrashError", () => {
		const trashed = aQuiz({ trashedAt: oneDayLater });

		expect(() => touchQuiz(trashed, twoDaysLater)).toThrow(QuizInTrashError);
	});
});

describe("renameQuiz", () => {
	it("renames within 95 characters and touches updatedAt", () => {
		const title = "Á".repeat(95);

		expect(renameQuiz(aQuiz(), `  ${title} `, oneDayLater)).toEqual({
			...aQuiz(),
			title,
			updatedAt: oneDayLater,
		});
		expect(() => renameQuiz(aQuiz(), "a".repeat(96), oneDayLater)).toThrow(
			QuizTitleTooLongError,
		);
	});

	it("renaming to blank stores no title", () => {
		expect(renameQuiz(aQuiz(), "   ", oneDayLater).title).toBeNull();
		expect(renameQuiz(aQuiz(), null, oneDayLater).title).toBeNull();
	});

	it("renaming a trashed quiz throws QuizInTrashError", () => {
		const trashed = aQuiz({ trashedAt: oneDayLater });

		expect(() => renameQuiz(trashed, "Novo", twoDaysLater)).toThrow(
			QuizInTrashError,
		);
	});
});
