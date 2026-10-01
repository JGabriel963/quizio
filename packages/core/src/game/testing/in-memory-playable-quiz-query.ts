import type {
	PlayableQuiz,
	PlayableQuizQuery,
} from "../application/ports/playable-quiz-query";

export class InMemoryPlayableQuizQuery implements PlayableQuizQuery {
	/** Reads from the source on every call, so tests see later changes. */
	constructor(private readonly source: () => readonly PlayableQuiz[]) {}

	async find(quizId: string): Promise<PlayableQuiz | null> {
		return this.source().find((quiz) => quiz.id === quizId) ?? null;
	}
}

/** Test builder: a published quiz of user-1, version 1. */
export function aPlayableQuiz(
	overrides: Partial<PlayableQuiz> = {},
): PlayableQuiz {
	return {
		id: "quiz-1",
		ownerId: "user-1",
		title: "Bom de Bíblia (Junho)",
		version: 1,
		trashed: false,
		...overrides,
	};
}
