import type { QuestionRepository } from "../application/ports/question-repository";
import type { Question } from "../domain/question";

export class InMemoryQuestionRepository implements QuestionRepository {
	readonly #lists = new Map<string, Question[]>();

	async listByQuiz(quizId: string): Promise<Question[]> {
		return this.listOf(quizId);
	}

	async countByQuiz(quizId: string): Promise<number> {
		return this.listOf(quizId).length;
	}

	async saveList(
		quizId: string,
		questions: readonly Question[],
	): Promise<void> {
		const ownedElsewhere = new Set(
			[...this.#lists.entries()]
				.filter(([otherQuizId]) => otherQuizId !== quizId)
				.flatMap(([, list]) => list.map(({ id }) => id)),
		);
		this.#lists.set(
			quizId,
			questions.filter(({ id }) => !ownedElsewhere.has(id)),
		);
	}

	async saveQuestion(quizId: string, question: Question): Promise<void> {
		const list = this.listOf(quizId);
		this.#lists.set(
			quizId,
			list.map((item) => (item.id === question.id ? question : item)),
		);
	}

	async deleteAllOfQuiz(quizId: string): Promise<void> {
		this.#lists.delete(quizId);
	}

	/** Test helper: a copy of the quiz's questions in order. */
	listOf(quizId: string): Question[] {
		return [...(this.#lists.get(quizId) ?? [])];
	}
}
