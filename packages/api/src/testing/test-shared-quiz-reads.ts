import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type {
	SharedQuizCard,
	SharedQuizReads,
} from "@quizio/core/groups/application/ports/shared-quiz-reads";
import type {
	SharedQuiz,
	SharedQuizSort,
} from "@quizio/core/groups/domain/shared-quiz";
import type { InMemoryGroupStore } from "@quizio/core/groups/testing/in-memory-group-store";
import type { QuizVersionRepository } from "@quizio/core/quiz/application/ports/quiz-version-repository";
import { UNTITLED_QUIZ_TITLE } from "@quizio/core/quiz/domain/quiz-details";
import type { InMemoryQuizRepository } from "@quizio/core/quiz/testing/in-memory-quiz-repository";
import type { QuizShareGrants } from "@quizio/core/shared/application/ports/quiz-share-grants";
import { normalizeSearchText } from "@quizio/core/shared/domain/search-text";

/**
 * The shared quizzes over the test API's quizzes, versions and groups, as the
 * database adapters join their tables (spec 037).
 */
export function testSharedQuizReads(deps: {
	quizzes: InMemoryQuizRepository;
	versions: QuizVersionRepository;
	groups: InMemoryGroupStore;
	games: Pick<GameRepository, "listUnendedByQuiz">;
}): SharedQuizReads {
	const playable = (quizId: string) => {
		const quiz = deps.quizzes
			.all()
			.find((candidate) => candidate.id === quizId);
		return quiz && quiz.publishedVersion !== null && quiz.trashedAt === null
			? quiz
			: null;
	};

	async function cardOf(
		share: SharedQuiz,
	): Promise<(SharedQuizCard & { description: string }) | null> {
		const quiz = playable(share.quizId);
		const version =
			quiz?.publishedVersion != null
				? await deps.versions.find(quiz.id, quiz.publishedVersion)
				: null;
		if (!quiz || !version) {
			return null;
		}
		return {
			sharedQuizId: share.id,
			quizId: quiz.id,
			title: quiz.title ?? UNTITLED_QUIZ_TITLE,
			coverImageKey: quiz.coverImageKey,
			questionCount: version.questions.length,
			visibility: quiz.visibility,
			ownerId: quiz.ownerId,
			ownerName: deps.groups.userName(quiz.ownerId),
			sharedById: share.sharedById,
			sharedAt: share.sharedAt,
			games: 0,
			description: quiz.description ?? "",
		};
	}

	const cardsOf = async (shares: readonly SharedQuiz[]) =>
		(await Promise.all(shares.map(cardOf))).flatMap((card) =>
			card ? [card] : [],
		);

	const strip = ({
		description: _,
		...card
	}: SharedQuizCard & { description: string }): SharedQuizCard => card;

	const compare: Record<
		SharedQuizSort,
		(a: SharedQuizCard, b: SharedQuizCard) => number
	> = {
		recent: (a, b) => b.sharedAt.getTime() - a.sharedAt.getTime(),
		oldest: (a, b) => a.sharedAt.getTime() - b.sharedAt.getTime(),
		nameAsc: (a, b) =>
			normalizeSearchText(a.title).localeCompare(normalizeSearchText(b.title)),
		nameDesc: (a, b) =>
			normalizeSearchText(b.title).localeCompare(normalizeSearchText(a.title)),
	};

	return {
		async shareableQuizIds(ownerId, quizIds) {
			return quizIds.filter((id) => playable(id)?.ownerId === ownerId);
		},
		async listSharedQuizzes(groupId, sort, limit) {
			return (await cardsOf(deps.groups.sharesOf(groupId)))
				.map(strip)
				.sort(compare[sort])
				.slice(0, limit);
		},
		async sharedQuizCards(sharedQuizIds) {
			return (
				await cardsOf(
					sharedQuizIds.flatMap((id) => deps.groups.shareById(id) ?? []),
				)
			).map(strip);
		},
		async sharedQuizDetail(groupId, quizId) {
			const share = deps.groups
				.sharesOf(groupId)
				.find((candidate) => candidate.quizId === quizId);
			const card = share ? await cardOf(share) : null;
			const quiz = playable(quizId);
			if (!share || !card || quiz?.publishedVersion == null) {
				return null;
			}
			const version = await deps.versions.find(quizId, quiz.publishedVersion);
			return {
				...card,
				sharedByName: deps.groups.userName(share.sharedById),
				participants: 0,
				questions: version?.questions ?? [],
			};
		},
	};
}

/** A member of a group that shares the quiz may use it, as the database says. */
export function testQuizShareGrants(
	groups: InMemoryGroupStore,
	quizzes: InMemoryQuizRepository,
): QuizShareGrants {
	return {
		async canUse(userId, quizId) {
			// Public, published and out of the trash: anybody (spec 039, RN-33).
			const quiz = await quizzes.findById(quizId);
			if (
				quiz?.visibility === "public" &&
				quiz.publishedVersion !== null &&
				quiz.trashedAt === null
			) {
				return true;
			}
			return (await groups.listForUser(userId)).some((group) =>
				groups.sharesOf(group.id).some((share) => share.quizId === quizId),
			);
		},
	};
}
