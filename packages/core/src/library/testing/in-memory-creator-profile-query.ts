import type {
	CreatorProfileQuery,
	ProfileCreator,
	PublicQuizDetail,
} from "../application/ports/creator-profile-query";

/** Public quizzes given by hand, already filtered and in order. */
export class InMemoryCreatorProfileQuery implements CreatorProfileQuery {
	readonly #creators = new Map<string, ProfileCreator>();
	readonly #quizzes = new Map<string, PublicQuizDetail[]>();

	addCreator(creator: ProfileCreator): void {
		this.#creators.set(creator.userId, creator);
	}

	addPublicQuiz(
		ownerId: string,
		quiz: Omit<PublicQuizDetail, "customTheme"> &
			Partial<Pick<PublicQuizDetail, "customTheme">>,
	): void {
		this.#quizzes.set(ownerId, [
			...(this.#quizzes.get(ownerId) ?? []),
			{ customTheme: null, ...quiz },
		]);
	}

	/** The owner made it private, trashed or deleted it. */
	removePublicQuiz(ownerId: string, quizId: string): void {
		this.#quizzes.set(
			ownerId,
			(this.#quizzes.get(ownerId) ?? []).filter(
				(quiz) => quiz.quizId !== quizId,
			),
		);
	}

	async creator(userId: string): Promise<ProfileCreator | null> {
		return this.#creators.get(userId) ?? null;
	}

	async publicQuizzes(ownerId: string) {
		return (this.#quizzes.get(ownerId) ?? []).map(
			({ description: _, questions: __, ...card }) => card,
		);
	}

	async publicQuiz(
		ownerId: string,
		quizId: string,
	): Promise<PublicQuizDetail | null> {
		return (
			(this.#quizzes.get(ownerId) ?? []).find(
				(quiz) => quiz.quizId === quizId,
			) ?? null
		);
	}
}
