import type { AssignmentOptions } from "../../game/domain/assignment";
import { DomainError } from "../../shared/domain/domain-error";
import type {
	GroupAssignmentQuery,
	GroupAssignments,
} from "../application/ports/group-assignments";
import type { GroupAssignmentRecord } from "../domain/group-assignment";

interface FakeQuiz {
	id: string;
	ownerId: string;
	ownerName: string;
	title: string;
	questionCount: number;
	coverImageKey: string | null;
}

class FakeQuizNotFoundError extends DomainError {
	readonly code = "GAME.QUIZ_NOT_FOUND";
}

/**
 * Assignments as the groups see them: `create` makes one of a quiz given with
 * `addQuiz`, and the test ends it, runs out its deadline or deletes it, as
 * the game context and the reports would.
 */
export class InMemoryGroupAssignments
	implements GroupAssignments, GroupAssignmentQuery
{
	readonly #quizzes = new Map<string, FakeQuiz>();
	readonly #records = new Map<string, GroupAssignmentRecord>();
	#next = 1;
	#refusal: unknown = null;
	/** What `create` was asked, in order. */
	readonly created: {
		ownerId: string;
		quizId: string;
		deadline: Date;
		options: AssignmentOptions;
	}[] = [];

	addQuiz(quiz: FakeQuiz): void {
		this.#quizzes.set(quiz.id, { ...quiz });
	}

	/** The next `create` throws this, as a refused deadline would. */
	refuseNext(error: unknown): void {
		this.#refusal = error;
	}

	/** Another assignment, created outside the group (spec 029). */
	put(record: GroupAssignmentRecord): void {
		this.#records.set(record.gameId, { ...record });
	}

	async create(input: {
		ownerId: string;
		quizId: string;
		deadline: Date;
		options: AssignmentOptions;
	}): Promise<{ gameId: string }> {
		if (this.#refusal) {
			const refusal = this.#refusal;
			this.#refusal = null;
			throw refusal;
		}
		const quiz = this.#quizzes.get(input.quizId);
		if (!quiz || quiz.ownerId !== input.ownerId) {
			throw new FakeQuizNotFoundError("Quiz not found");
		}
		this.created.push({ ...input, options: { ...input.options } });
		const gameId = `assignment-${this.#next++}`;
		this.#records.set(gameId, {
			gameId,
			ownerId: quiz.ownerId,
			ownerName: quiz.ownerName,
			name: quiz.title,
			questionCount: quiz.questionCount,
			coverImageKey: quiz.coverImageKey,
			expiresAt: input.deadline,
			endedAt: null,
		});
		return { gameId };
	}

	/** "Encerrar agora" (spec 029). */
	end(gameId: string, at: Date): void {
		const record = this.#records.get(gameId);
		if (record) {
			this.#records.set(gameId, { ...record, endedAt: at });
		}
	}

	/** The report deleted for good (spec 015). */
	remove(gameId: string): void {
		this.#records.delete(gameId);
	}

	async findAssignments(
		gameIds: readonly string[],
	): Promise<GroupAssignmentRecord[]> {
		return gameIds.flatMap((gameId) => {
			const record = this.#records.get(gameId);
			return record ? [{ ...record }] : [];
		});
	}
}
