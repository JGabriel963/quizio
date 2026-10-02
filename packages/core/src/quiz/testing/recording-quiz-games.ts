import type { QuizGames } from "../application/ports/quiz-games";

/** For quiz tests: remembers which quizzes it was asked to end the games of. */
export class RecordingQuizGames implements QuizGames {
	readonly endedQuizIds: string[] = [];

	async endGamesOfDeletedQuiz(quizId: string): Promise<void> {
		this.endedQuizIds.push(quizId);
	}
}
