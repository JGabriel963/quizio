/** What the game context needs to know about a quiz to host it (spec 008). */
export interface PlayableQuiz {
	id: string;
	ownerId: string;
	title: string | null;
	/** Number of the playable version in force; null for a draft. */
	version: number | null;
	trashed: boolean;
}

/** Read model over the quiz context: the game never loads the quiz aggregate. */
export interface PlayableQuizQuery {
	find(quizId: string): Promise<PlayableQuiz | null>;
}
