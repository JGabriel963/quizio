import { parseStoredGameQuestion } from "@quizio/core/game/domain/game-question";
import type {
	ReportGameQuery,
	ReportTally,
} from "@quizio/core/reports/application/ports/report-game-query";
import {
	playedQuestionCount,
	type ReportHeader,
} from "@quizio/core/reports/domain/report";
import type { ReportQuestion } from "@quizio/core/reports/domain/report-game";
import {
	and,
	asc,
	count as countRows,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	or,
	sql,
} from "drizzle-orm";

import {
	gameAnswer,
	gamePlayer,
	gameQuestion,
	game as gameTable,
} from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { report as reportTable } from "../../schema/reports";
import type { Database } from "../../types";

/** What a header is made of: the game, what the report changed, and its quiz. */
const headerColumns = {
	gameId: gameTable.id,
	ownerId: gameTable.ownerId,
	title: gameTable.title,
	quizId: gameTable.quizId,
	status: gameTable.status,
	questionCount: gameTable.questionCount,
	questionIndex: gameTable.questionIndex,
	phase: gameTable.phase,
	createdAt: gameTable.createdAt,
	startedAt: gameTable.startedAt,
	expiresAt: gameTable.expiresAt,
	endedAt: gameTable.endedAt,
	reportName: reportTable.name,
	trashedAt: reportTable.trashedAt,
	// Null when the quiz was deleted for good: the game only keeps its id.
	quizRowId: quizTable.id,
	quizTrashedAt: quizTable.trashedAt,
	quizPublishedVersion: quizTable.publishedVersion,
	quizCoverImageKey: quizTable.coverImageKey,
};

interface HeaderRow {
	gameId: string;
	ownerId: string;
	title: string;
	quizId: string;
	status: (typeof gameTable.$inferSelect)["status"];
	questionCount: number;
	questionIndex: number | null;
	phase: (typeof gameTable.$inferSelect)["phase"];
	createdAt: Date;
	startedAt: Date | null;
	expiresAt: Date;
	endedAt: Date | null;
	reportName: string | null;
	trashedAt: Date | null;
	quizRowId: string | null;
	quizTrashedAt: Date | null;
	quizPublishedVersion: number | null;
	quizCoverImageKey: string | null;
}

function toHeader(row: HeaderRow): ReportHeader {
	const finished = row.status === "finished";
	return {
		gameId: row.gameId,
		ownerId: row.ownerId,
		name: row.reportName ?? row.title,
		quizId: row.quizId,
		quiz:
			row.quizRowId === null
				? null
				: {
						trashed: row.quizTrashedAt !== null,
						playable: row.quizPublishedVersion !== null,
						coverImageKey: row.quizCoverImageKey,
					},
		questionCount: row.questionCount,
		outcome: finished ? "finished" : "ended",
		// A game that was ended keeps where it was (spec 009).
		stoppedAt:
			!finished && row.questionIndex !== null && row.phase !== null
				? { questionIndex: row.questionIndex, phase: row.phase }
				: null,
		// Games from before the start was stored count from their creation.
		startedAt: row.startedAt ?? row.createdAt,
		// Past its deadline and never opened again: it ended there (spec 008, RN-11).
		endedAt: row.endedAt ?? row.expiresAt,
		trashedAt: row.trashedAt,
	};
}

/** A report is a game that started and is over (spec 015, RN-01, RN-02). */
const isReport = (now: Date) =>
	and(
		// A game has questions from the moment it starts.
		gt(gameTable.questionCount, 0),
		or(isNotNull(gameTable.endedAt), lte(gameTable.expiresAt, now)),
	);

const endedAt = sql`coalesce(${gameTable.endedAt}, ${gameTable.expiresAt})`;

export function createDrizzleReportGameQuery(db: Database): ReportGameQuery {
	const headers = () =>
		db
			.select(headerColumns)
			.from(gameTable)
			.leftJoin(reportTable, eq(reportTable.gameId, gameTable.id))
			.leftJoin(quizTable, eq(quizTable.id, gameTable.quizId));

	async function findHeader(
		gameId: string,
		now: Date,
	): Promise<ReportHeader | null> {
		const [row] = await headers()
			.where(and(eq(gameTable.id, gameId), isReport(now)))
			.limit(1);
		return row ? toHeader(row) : null;
	}

	return {
		findHeader,

		async listHeaders({ ownerId, section, now }) {
			const rows = await headers()
				.where(
					and(
						eq(gameTable.ownerId, ownerId),
						isReport(now),
						section === "trash"
							? isNotNull(reportTable.trashedAt)
							: isNull(reportTable.trashedAt),
					),
				)
				.orderBy(desc(endedAt), asc(gameTable.id));
			return rows.map(toHeader);
		},

		async tallies(reportHeaders) {
			if (reportHeaders.length === 0) {
				return [];
			}
			const gameIds = reportHeaders.map(({ gameId }) => gameId);
			const [players, correct] = await Promise.all([
				db
					.select({
						gameId: gamePlayer.gameId,
						firstQuestionIndex: gamePlayer.firstQuestionIndex,
					})
					.from(gamePlayer)
					.where(
						and(
							inArray(gamePlayer.gameId, gameIds),
							isNull(gamePlayer.removedAt),
						),
					)
					.orderBy(asc(gamePlayer.joinedAt), asc(gamePlayer.id)),
				db
					.select({
						gameId: gameAnswer.gameId,
						questionIndex: gameAnswer.questionIndex,
						count: countRows(),
					})
					.from(gameAnswer)
					.where(
						and(
							inArray(gameAnswer.gameId, gameIds),
							eq(gameAnswer.correctness, "correct"),
						),
					)
					.groupBy(gameAnswer.gameId, gameAnswer.questionIndex),
			]);

			return reportHeaders.map((header): ReportTally => {
				const played = playedQuestionCount(header);
				return {
					gameId: header.gameId,
					participantFirstQuestions: players
						.filter((player) => player.gameId === header.gameId)
						.map((player) => player.firstQuestionIndex),
					// Each game stopped at its own question, so the cut is made here.
					correctAnswers: correct
						.filter(
							(row) =>
								row.gameId === header.gameId && row.questionIndex < played,
						)
						.reduce((sum, row) => sum + row.count, 0),
				};
			});
		},

		async findGame(gameId, now) {
			const header = await findHeader(gameId, now);
			if (!header) {
				return null;
			}
			const played = playedQuestionCount(header);
			const [participants, questionRows, answers] = await Promise.all([
				db
					.select({
						id: gamePlayer.id,
						nickname: gamePlayer.nickname,
						firstQuestionIndex: gamePlayer.firstQuestionIndex,
						joinedAt: gamePlayer.joinedAt,
					})
					.from(gamePlayer)
					.where(
						and(eq(gamePlayer.gameId, gameId), isNull(gamePlayer.removedAt)),
					)
					.orderBy(asc(gamePlayer.joinedAt), asc(gamePlayer.id)),
				db
					.select({ question: gameQuestion.question })
					.from(gameQuestion)
					.where(
						and(
							eq(gameQuestion.gameId, gameId),
							lt(gameQuestion.index, played),
						),
					)
					.orderBy(asc(gameQuestion.index)),
				db
					.select({
						questionIndex: gameAnswer.questionIndex,
						playerId: gameAnswer.playerId,
						choiceIds: gameAnswer.choiceIds,
						correctness: gameAnswer.correctness,
						points: gameAnswer.points,
						responseTimeMs: gameAnswer.responseTimeMs,
					})
					.from(gameAnswer)
					.where(
						and(
							eq(gameAnswer.gameId, gameId),
							lt(gameAnswer.questionIndex, played),
						),
					)
					.orderBy(asc(gameAnswer.questionIndex), asc(gameAnswer.playerId)),
			]);

			return {
				header,
				participants,
				questions: questionRows.flatMap(({ question }): ReportQuestion[] => {
					const parsed = parseStoredGameQuestion(question);
					return parsed
						? [
								{
									index: parsed.index,
									type: parsed.type,
									text: parsed.text,
									imageKey: parsed.image?.key ?? null,
									choices: parsed.choices,
								},
							]
						: [];
				}),
				answers,
			};
		},
	};
}
