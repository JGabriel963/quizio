import type {
	SharedQuizCard,
	SharedQuizReads,
} from "@quizio/core/groups/application/ports/shared-quiz-reads";
import type { SharedQuizSort } from "@quizio/core/groups/domain/shared-quiz";
import { UNTITLED_QUIZ_TITLE } from "@quizio/core/quiz/domain/quiz-details";
import { parseVersionQuestions } from "@quizio/core/quiz/domain/quiz-version";
import { knownThemeId } from "@quizio/core/shared/domain/theme";
import { readThemeLook } from "@quizio/core/shared/domain/theme-look";
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { user } from "../../schema/auth";
import { groupSharedQuiz } from "../../schema/groups";
import { quiz as quizTable, quizVersion } from "../../schema/quiz";
import { customTheme } from "../../schema/themes";
import type { Database } from "../../types";
import { quizGameCounts } from "../game/quiz-game-counts";

/** A quiz the group can see: it has a playable version and is out of the trash (RN-23). */
const alive = and(
	eq(quizTable.status, "published"),
	isNotNull(quizTable.publishedVersion),
	isNull(quizTable.trashedAt),
);

/**
 * The groups' reading of shared quizzes (spec 037; ADR 0018): the quiz, its
 * playable version in force, the owner's name and the games started with it.
 */
export function createDrizzleSharedQuizReads(db: Database): SharedQuizReads {
	const owner = alias(user, "owner");

	async function cards(where: SQL | undefined, orderBy: SQL[], limit?: number) {
		const query = db
			.select({
				sharedQuizId: groupSharedQuiz.id,
				quizId: quizTable.id,
				title: quizTable.title,
				searchTitle: quizTable.searchTitle,
				coverImageKey: quizTable.coverImageKey,
				visibility: quizTable.visibility,
				ownerId: quizTable.ownerId,
				ownerName: owner.name,
				sharedById: groupSharedQuiz.sharedById,
				sharedAt: groupSharedQuiz.sharedAt,
				questions: quizVersion.questions,
			})
			.from(groupSharedQuiz)
			.innerJoin(quizTable, eq(quizTable.id, groupSharedQuiz.quizId))
			.innerJoin(owner, eq(owner.id, quizTable.ownerId))
			.innerJoin(
				quizVersion,
				and(
					eq(quizVersion.quizId, quizTable.id),
					eq(quizVersion.number, quizTable.publishedVersion),
				),
			)
			.where(and(alive, where))
			.orderBy(...orderBy);
		const rows = await (limit === undefined ? query : query.limit(limit));
		const games = await gameCounts(rows.map((row) => row.quizId));
		return rows.map(
			({
				questions,
				searchTitle: _,
				...row
			}): SharedQuizCard & {
				questionsJson: unknown;
			} => ({
				...row,
				title: row.title ?? UNTITLED_QUIZ_TITLE,
				questionCount: parseVersionQuestions(questions).length,
				games: games.get(row.quizId)?.games ?? 0,
				questionsJson: questions,
			}),
		);
	}

	const gameCounts = (quizIds: readonly string[]) =>
		quizGameCounts(db, quizIds);

	const strip = ({
		questionsJson: _,
		...card
	}: SharedQuizCard & { questionsJson: unknown }): SharedQuizCard => card;

	const orders: Record<SharedQuizSort, SQL[]> = {
		recent: [desc(groupSharedQuiz.sharedAt), desc(groupSharedQuiz.id)],
		oldest: [asc(groupSharedQuiz.sharedAt), asc(groupSharedQuiz.id)],
		// The stored search title has neither accents nor case (spec 001).
		nameAsc: [asc(quizTable.searchTitle), asc(groupSharedQuiz.id)],
		nameDesc: [desc(quizTable.searchTitle), desc(groupSharedQuiz.id)],
	};

	return {
		async shareableQuizIds(ownerId, quizIds) {
			if (quizIds.length === 0) {
				return [];
			}
			const rows = await db
				.select({ id: quizTable.id })
				.from(quizTable)
				.where(
					and(
						eq(quizTable.ownerId, ownerId),
						inArray(quizTable.id, [...quizIds]),
						alive,
					),
				);
			return rows.map((row) => row.id);
		},

		async listSharedQuizzes(groupId, sort, limit) {
			return (
				await cards(eq(groupSharedQuiz.groupId, groupId), orders[sort], limit)
			).map(strip);
		},

		async sharedQuizCards(sharedQuizIds) {
			if (sharedQuizIds.length === 0) {
				return [];
			}
			return (
				await cards(inArray(groupSharedQuiz.id, [...sharedQuizIds]), [])
			).map(strip);
		},

		async sharedQuizDetail(groupId, quizId) {
			const [card] = await cards(
				and(
					eq(groupSharedQuiz.groupId, groupId),
					eq(groupSharedQuiz.quizId, quizId),
				),
				[],
			);
			if (!card) {
				return null;
			}
			const [details] = await db
				.select({
					description: quizTable.description,
					sharedByName: user.name,
					themeId: quizTable.themeId,
					look: customTheme.look,
				})
				.from(quizTable)
				.innerJoin(user, eq(user.id, card.sharedById))
				// The owner's custom theme, for the game's opening (spec 043, RN-25).
				.leftJoin(customTheme, eq(customTheme.id, quizTable.customThemeId))
				.where(eq(quizTable.id, quizId));
			const totals = await gameCounts([quizId]);
			return {
				...strip(card),
				description: details?.description ?? "",
				sharedByName: details?.sharedByName ?? "",
				participants: totals.get(quizId)?.participants ?? 0,
				questions: parseVersionQuestions(card.questionsJson),
				themeId: knownThemeId(details?.themeId),
				customTheme: readThemeLook(details?.look),
			};
		},
	};
}
