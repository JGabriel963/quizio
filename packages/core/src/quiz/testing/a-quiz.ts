import type { Quiz } from "../domain/quiz";

/** Test builder: a valid, non-trashed draft owned by user-1. */
export function aQuiz(overrides: Partial<Quiz> = {}): Quiz {
	const createdAt = new Date("2026-01-01T10:00:00.000Z");
	return {
		id: "quiz-1",
		ownerId: "user-1",
		title: "Bom de Bíblia (Junho)",
		description: "Atos 1 a 7",
		coverImageKey: null,
		visibility: "private",
		status: "draft",
		publishedVersion: null,
		publishedAt: null,
		hasUnpublishedChanges: false,
		createdAt,
		updatedAt: createdAt,
		trashedAt: null,
		...overrides,
	};
}

/** Test builder: a quiz already saved as playable, version 1 by default. */
export function aPublishedQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return aQuiz({
		status: "published",
		publishedVersion: 1,
		publishedAt: new Date("2026-02-01T10:00:00.000Z"),
		...overrides,
	});
}
