import type { Question } from "../../quiz/domain/question";
import type { QuizVisibility } from "../../quiz/domain/quiz-details";
import { normalizeSearchText } from "../../shared/domain/search-text";
import type { ThemeId } from "../../shared/domain/theme";
import type { ThemeLook } from "../../shared/domain/theme-look";
import type {
	SharedQuizCard,
	SharedQuizDetail,
	SharedQuizReads,
} from "../application/ports/shared-quiz-reads";
import type { SharedQuiz, SharedQuizSort } from "../domain/shared-quiz";
import type { InMemoryGroupStore } from "./in-memory-group-store";

/** A quiz as the read model joins it, given by the test. */
export interface FakeSharedQuizSource {
	id: string;
	ownerId: string;
	ownerName: string;
	title: string;
	description: string;
	coverImageKey: string | null;
	visibility: QuizVisibility;
	/** It has a playable version (spec 006). */
	published: boolean;
	trashed: boolean;
	questions: Question[];
	games: number;
	participants: number;
	themeId: ThemeId;
	customTheme: ThemeLook | null;
}

const bySharedAt = (a: SharedQuiz, b: SharedQuiz) =>
	a.sharedAt.getTime() - b.sharedAt.getTime() ||
	(a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The quizzes the groups read, over the store's shares: the test adds the
 * quizzes (`addQuiz`) and trashes or unpublishes them as the quiz context
 * would (`updateQuiz`).
 */
export class InMemorySharedQuizReads implements SharedQuizReads {
	readonly #quizzes = new Map<string, FakeSharedQuizSource>();

	constructor(private readonly store: InMemoryGroupStore) {}

	addQuiz(
		quiz: Partial<FakeSharedQuizSource> & { id: string; ownerId: string },
	): void {
		this.#quizzes.set(quiz.id, {
			ownerName: this.store.userName(quiz.ownerId),
			title: `Quiz ${quiz.id}`,
			description: "",
			coverImageKey: null,
			visibility: "private",
			published: true,
			trashed: false,
			questions: [],
			games: 0,
			participants: 0,
			themeId: "standard",
			customTheme: null,
			...quiz,
		});
	}

	updateQuiz(id: string, patch: Partial<FakeSharedQuizSource>): void {
		const quiz = this.#quizzes.get(id);
		if (quiz) {
			this.#quizzes.set(id, { ...quiz, ...patch });
		}
	}

	async shareableQuizIds(
		ownerId: string,
		quizIds: readonly string[],
	): Promise<string[]> {
		return quizIds.filter((id) => {
			const quiz = this.#quizzes.get(id);
			return quiz?.ownerId === ownerId && this.#playable(quiz);
		});
	}

	async listSharedQuizzes(
		groupId: string,
		sort: SharedQuizSort,
		limit: number,
	): Promise<SharedQuizCard[]> {
		const cards = this.store
			.sharesOf(groupId)
			.flatMap((share) => this.#cardOf(share) ?? []);
		const byName = (a: SharedQuizCard, b: SharedQuizCard) =>
			normalizeSearchText(a.title).localeCompare(
				normalizeSearchText(b.title),
				"pt-BR",
			) || a.sharedQuizId.localeCompare(b.sharedQuizId);
		const asShare = (card: SharedQuizCard): SharedQuiz => ({
			id: card.sharedQuizId,
			groupId,
			quizId: card.quizId,
			sharedById: card.sharedById,
			sharedAt: card.sharedAt,
		});
		const compare: Record<
			SharedQuizSort,
			(a: SharedQuizCard, b: SharedQuizCard) => number
		> = {
			recent: (a, b) => -bySharedAt(asShare(a), asShare(b)),
			oldest: (a, b) => bySharedAt(asShare(a), asShare(b)),
			nameAsc: byName,
			nameDesc: (a, b) => -byName(a, b),
		};
		return cards.sort(compare[sort]).slice(0, limit);
	}

	async sharedQuizCards(
		sharedQuizIds: readonly string[],
	): Promise<SharedQuizCard[]> {
		return sharedQuizIds.flatMap((id) => {
			const share = this.store.shareById(id);
			return (share && this.#cardOf(share)) ?? [];
		});
	}

	async sharedQuizDetail(
		groupId: string,
		quizId: string,
	): Promise<SharedQuizDetail | null> {
		const share = this.store
			.sharesOf(groupId)
			.find((candidate) => candidate.quizId === quizId);
		const card = share ? this.#cardOf(share) : null;
		const quiz = this.#quizzes.get(quizId);
		if (!share || !card || !quiz) {
			return null;
		}
		return {
			...card,
			description: quiz.description,
			sharedByName: this.store.userName(share.sharedById),
			participants: quiz.participants,
			questions: quiz.questions,
			themeId: quiz.themeId,
			customTheme: quiz.customTheme,
		};
	}

	#playable(quiz: FakeSharedQuizSource): boolean {
		return quiz.published && !quiz.trashed;
	}

	#cardOf(share: SharedQuiz): SharedQuizCard | null {
		const quiz = this.#quizzes.get(share.quizId);
		if (!quiz || !this.#playable(quiz)) {
			return null;
		}
		return {
			sharedQuizId: share.id,
			quizId: quiz.id,
			title: quiz.title,
			coverImageKey: quiz.coverImageKey,
			questionCount: quiz.questions.length,
			visibility: quiz.visibility,
			ownerId: quiz.ownerId,
			ownerName: quiz.ownerName,
			sharedById: share.sharedById,
			sharedAt: share.sharedAt,
			games: quiz.games,
		};
	}
}
