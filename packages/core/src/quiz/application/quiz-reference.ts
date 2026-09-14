/** Identifies a quiz on behalf of the signed-in creator who must own it. */
export interface QuizReference {
	ownerId: string;
	quizId: string;
}
