import type { QuizShareGrants } from "../application/ports/quiz-share-grants";

/** Grants given by hand; the real one reads the groups' shares (ADR 0018). */
export class InMemoryQuizShareGrants implements QuizShareGrants {
	private readonly granted = new Set<string>();

	grant(userId: string, quizId: string): void {
		this.granted.add(`${userId}\u0000${quizId}`);
	}

	revoke(userId: string, quizId: string): void {
		this.granted.delete(`${userId}\u0000${quizId}`);
	}

	async canUse(userId: string, quizId: string): Promise<boolean> {
		return this.granted.has(`${userId}\u0000${quizId}`);
	}
}
