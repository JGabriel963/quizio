import type {
	CreatorProfileQuery,
	PublicQuizCard,
} from "@quizio/core/library/application/ports/creator-profile-query";
import { UNTITLED_QUIZ_TITLE } from "@quizio/core/quiz/domain/quiz-details";
import { parseVersionQuestions } from "@quizio/core/quiz/domain/quiz-version";
import { and, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";

import { user } from "../../schema/auth";
import { profilePhoto } from "../../schema/identity";
import { quiz as quizTable, quizVersion } from "../../schema/quiz";
import type { Database } from "../../types";
import { quizGameCounts } from "../game/quiz-game-counts";

/**
 * The profile's reading (spec 039, RN-27 to RN-30): the account, and its
 * public quizzes from the playable version in force, published and out of
 * the trash, with the games started with them.
 */
export function createDrizzleCreatorProfileQuery(
	db: Database,
): CreatorProfileQuery {
	async function publicRows(ownerId: string, where?: SQL) {
		const rows = await db
			.select({
				quizId: quizTable.id,
				title: quizTable.title,
				description: quizTable.description,
				coverImageKey: quizTable.coverImageKey,
				questions: quizVersion.questions,
			})
			.from(quizTable)
			.innerJoin(
				quizVersion,
				and(
					eq(quizVersion.quizId, quizTable.id),
					eq(quizVersion.number, quizTable.publishedVersion),
				),
			)
			.where(
				and(
					eq(quizTable.ownerId, ownerId),
					eq(quizTable.visibility, "public"),
					isNotNull(quizTable.publishedVersion),
					isNull(quizTable.trashedAt),
					where,
				),
			)
			.orderBy(desc(quizTable.publishedAt), desc(quizTable.id));
		const counts = await quizGameCounts(
			db,
			rows.map((row) => row.quizId),
		);
		return rows.map((row) => {
			const questions = parseVersionQuestions(row.questions);
			const totals = counts.get(row.quizId);
			const card: PublicQuizCard = {
				quizId: row.quizId,
				title: row.title ?? UNTITLED_QUIZ_TITLE,
				coverImageKey: row.coverImageKey,
				questionCount: questions.length,
				games: totals?.games ?? 0,
				participants: totals?.participants ?? 0,
			};
			return { card, description: row.description ?? "", questions };
		});
	}

	return {
		async creator(userId) {
			const [row] = await db
				.select({
					userId: user.id,
					name: user.name,
					photoKey: profilePhoto.key,
				})
				.from(user)
				.leftJoin(profilePhoto, eq(profilePhoto.userId, user.id))
				.where(eq(user.id, userId))
				.limit(1);
			return row ?? null;
		},

		async publicQuizzes(ownerId) {
			return (await publicRows(ownerId)).map(({ card }) => card);
		},

		async publicQuiz(ownerId, quizId) {
			const [row] = await publicRows(ownerId, eq(quizTable.id, quizId));
			return row
				? {
						...row.card,
						description: row.description,
						questions: row.questions,
					}
				: null;
		},
	};
}
