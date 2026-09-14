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
		createdAt,
		updatedAt: createdAt,
		trashedAt: null,
		...overrides,
	};
}
