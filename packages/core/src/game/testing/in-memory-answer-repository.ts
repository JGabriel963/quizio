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

	async totalsThrough(
		gameId: string,
		questionIndex: number,
	): Promise<{ playerId: string; total: number }[]> {
		const totals = new Map<string, number>();
		for (const answer of this.#answers) {
			if (answer.gameId === gameId && answer.questionIndex <= questionIndex) {
				totals.set(
					answer.playerId,
					(totals.get(answer.playerId) ?? 0) + answer.points,
				);
			}
		}
		return [...totals].map(([playerId, total]) => ({ playerId, total }));
	}

	async listByPlayer(gameId: string, playerId: string): Promise<Answer[]> {
		return this.#answers
			.filter(
				(answer) => answer.gameId === gameId && answer.playerId === playerId,
			)
			.sort((a, b) => a.questionIndex - b.questionIndex);
	}
}
