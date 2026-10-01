import type { AnswerRepository } from "../application/ports/answer-repository";
import type { Answer } from "../domain/answer";

export class InMemoryAnswerRepository implements AnswerRepository {
	/** In order of arrival. */
	readonly #answers: Answer[] = [];

	async add(answer: Answer): Promise<"added" | "alreadyAnswered"> {
		if (await this.find(answer.gameId, answer.questionIndex, answer.playerId)) {
			return "alreadyAnswered";
		}
		this.#answers.push(answer);
		return "added";
	}

	async find(
		gameId: string,
		questionIndex: number,
		playerId: string,
	): Promise<Answer | null> {
		return (
			(await this.listByQuestion(gameId, questionIndex)).find(
				(answer) => answer.playerId === playerId,
			) ?? null
		);
	}

	async listByQuestion(
		gameId: string,
		questionIndex: number,
	): Promise<Answer[]> {
		return this.#answers.filter(
			(answer) =>
				answer.gameId === gameId && answer.questionIndex === questionIndex,
		);
	}

	async countByQuestion(
		gameId: string,
		questionIndex: number,
	): Promise<number> {
		return (await this.listByQuestion(gameId, questionIndex)).length;
	}
}
