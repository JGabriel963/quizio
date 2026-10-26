import { ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS } from "@quizio/core/game/domain/assignment";
import { InMemoryAnswerRepository } from "@quizio/core/game/testing/in-memory-answer-repository";
import { InMemoryAssignmentLandingQuery } from "@quizio/core/game/testing/in-memory-assignment-landing-query";
import { InMemoryAssignmentPreferencesRepository } from "@quizio/core/game/testing/in-memory-assignment-preferences-repository";
import { InMemoryGameQuestionRepository } from "@quizio/core/game/testing/in-memory-game-question-repository";
import { InMemoryGameRepository } from "@quizio/core/game/testing/in-memory-game-repository";
import { InMemoryHostPreferencesRepository } from "@quizio/core/game/testing/in-memory-host-preferences-repository";
import { InMemoryPlayableQuizQuery } from "@quizio/core/game/testing/in-memory-playable-quiz-query";
import { InMemoryPlayerRepository } from "@quizio/core/game/testing/in-memory-player-repository";
import { InMemoryReviewResultsWriter } from "@quizio/core/game/testing/in-memory-review-results-writer";
import { SequentialAssignmentPinGenerator } from "@quizio/core/game/testing/sequential-assignment-pin-generator";
import { SequentialGamePinGenerator } from "@quizio/core/game/testing/sequential-game-pin-generator";
import { InMemoryGroupStore } from "@quizio/core/groups/testing/in-memory-group-store";
import { SequentialInviteCodeGenerator } from "@quizio/core/groups/testing/sequential-invite-code-generator";
import type { LibraryQuizRecord } from "@quizio/core/library/application/ports/library-quiz-query";
import { InMemoryLibraryQuizQuery } from "@quizio/core/library/testing/in-memory-library-quiz-query";
import { InMemorySourceUploadRepository } from "@quizio/core/media/testing/in-memory-source-upload-repository";
import type { Quiz } from "@quizio/core/quiz/domain/quiz";
import { quizSearchText } from "@quizio/core/quiz/domain/quiz-details";
import { FakePdfPages } from "@quizio/core/quiz/testing/fake-pdf-pages";
import { InMemoryAssistantPreferencesRepository } from "@quizio/core/quiz/testing/in-memory-assistant-preferences-repository";
import { InMemoryGenerationQuota } from "@quizio/core/quiz/testing/in-memory-generation-quota";
import { InMemoryQuestionGenerator } from "@quizio/core/quiz/testing/in-memory-question-generator";
import { InMemoryQuestionRepository } from "@quizio/core/quiz/testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "@quizio/core/quiz/testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "@quizio/core/quiz/testing/in-memory-quiz-version-repository";
import { InMemoryReportStore } from "@quizio/core/reports/testing/in-memory-report-store";
import { FixedClock } from "@quizio/core/shared/testing/fixed-clock";
import { FixedShuffler } from "@quizio/core/shared/testing/fixed-shuffler";
import { InMemoryAttemptLimiter } from "@quizio/core/shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "@quizio/core/shared/testing/in-memory-object-storage";
import { InMemoryRealtimePublisher } from "@quizio/core/shared/testing/in-memory-realtime-publisher";
import { SequentialIdGenerator } from "@quizio/core/shared/testing/sequential-id-generator";

import { type Adapters, createContainer } from "../container";
import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { appRouter } from "../routers/index";

const createCaller = createCallerFactory(appRouter);

export type TestApiCaller = ReturnType<typeof createCaller>;

export interface TestApi {
	/**
	 * Calls procedures as that signed-in creator, or as a visitor with `null`,
	 * from the given network address.
	 */
	callerFor(userId: string | null, clientIp?: string): TestApiCaller;
	quizzes: InMemoryQuizRepository;
	questions: InMemoryQuestionRepository;
	versions: InMemoryQuizVersionRepository;
	storage: InMemoryObjectStorage;
	games: InMemoryGameRepository;
	players: InMemoryPlayerRepository;
	answers: InMemoryAnswerRepository;
	/** Reports are put here directly: it does not read the games above. */
	reports: InMemoryReportStore;
	realtime: InMemoryRealtimePublisher;
	clock: FixedClock;
	/** The assistant's model, answering with three valid questions by default. */
	generator: InMemoryQuestionGenerator;
	sourceUploads: InMemorySourceUploadRepository;
	/** Reads the games above; the reports' and creators' names are set here. */
	assignmentLanding: InMemoryAssignmentLandingQuery;
	/** Every groups port; add the accounts the screens name with `addUser`. */
	groups: InMemoryGroupStore;
}

function toLibraryRecord(
	quiz: Quiz,
	questions: InMemoryQuestionRepository,
): LibraryQuizRecord {
	const {
		description,
		createdAt: _createdAt,
		publishedVersion: _publishedVersion,
		publishedAt: _publishedAt,
		...record
	} = quiz;
	return {
		...record,
		description: description ?? "",
		searchTitle: quizSearchText(quiz.title),
		questionCount: questions.listOf(quiz.id).length,
	};
}

/** Real routers and use cases over in-memory adapters. */
export function createTestApi(overrides: Partial<Adapters> = {}): TestApi {
	const quizzes = new InMemoryQuizRepository();
	const questions = new InMemoryQuestionRepository();
	const versions = new InMemoryQuizVersionRepository();
	const storage = new InMemoryObjectStorage("https://media.test");
	const games = new InMemoryGameRepository();
	const players = new InMemoryPlayerRepository();
	const answers = new InMemoryAnswerRepository();
	const reports = new InMemoryReportStore();
	const realtime = new InMemoryRealtimePublisher();
	const clock = new FixedClock("2026-06-01T12:00:00.000Z");
	const generator = new InMemoryQuestionGenerator();
	const sourceUploads = new InMemorySourceUploadRepository();
	const assignmentLanding = new InMemoryAssignmentLandingQuery(games, players);
	const groups = new InMemoryGroupStore();
	const adapters: Adapters = {
		storage,
		realtime,
		ids: new SequentialIdGenerator("id"),
		clock,
		quizzes,
		questions,
		versions,
		libraryQuizzes: new InMemoryLibraryQuizQuery(() =>
			quizzes.all().map((quiz) => toLibraryRecord(quiz, questions)),
		),
		games,
		players,
		gameQuestions: new InMemoryGameQuestionRepository(),
		answers,
		reviewResults: new InMemoryReviewResultsWriter(games, answers),
		playableQuizzes: new InMemoryPlayableQuizQuery(
			() =>
				quizzes.all().map((quiz) => ({
					id: quiz.id,
					ownerId: quiz.ownerId,
					title: quiz.title,
					version: quiz.publishedVersion,
					trashed: quiz.trashedAt !== null,
				})),
			async (quizId, version) =>
				(await versions.find(quizId, version))?.questions ?? [],
		),
		preferences: new InMemoryHostPreferencesRepository(),
		reportGames: reports,
		reports,
		pins: new SequentialGamePinGenerator("265914"),
		assignmentPins: new SequentialAssignmentPinGenerator("04352236"),
		assignmentPreferences: new InMemoryAssignmentPreferencesRepository(),
		assignmentLanding,
		assignmentSettings: {
			maxDeadlineDays: ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS,
		},
		shuffler: new FixedShuffler(),
		attempts: new InMemoryAttemptLimiter(),
		authSettings: { signUpEnabled: true, googleEnabled: false },
		questionGenerator: generator,
		pdfPages: new FakePdfPages(),
		generationQuota: new InMemoryGenerationQuota(),
		assistantPreferences: new InMemoryAssistantPreferencesRepository(),
		sourceUploads,
		assistantSettings: { generationsPerDay: 20 },
		groups,
		groupMembers: groups,
		groupVisits: groups,
		groupReads: groups,
		inviteCodes: new SequentialInviteCodeGenerator(),
		groupPosts: groups,
		groupFeed: groups,
		// Reads the games above, as the database adapter reads its tables.
		groupAssignmentQuery: {
			findAssignments: async (gameIds) => {
				const records = await Promise.all(
					gameIds.map(async (gameId) => {
						const game = await games.findById(gameId);
						if (game?.mode !== "assignment") {
							return [];
						}
						const quiz = await quizzes.findById(game.quizId);
						return [
							{
								gameId: game.id,
								ownerId: game.ownerId,
								ownerName: groups.userName(game.ownerId),
								name: game.title,
								questionCount: game.questionCount,
								coverImageKey: quiz?.coverImageKey ?? null,
								expiresAt: game.expiresAt,
								endedAt: game.endedAt,
							},
						];
					}),
				);
				return records.flat();
			},
		},
		// A group's admin reads the reports of the assignments posted there.
		reportReadGrants: {
			canRead: async (viewerId, gameId) => {
				const administered = (await groups.listForUser(viewerId))
					.filter((group) => group.role === "admin")
					.map((group) => group.id);
				return (
					(await groups.groupsWithAssignment(gameId, administered)).length > 0
				);
			},
		},
		...overrides,
	};
	const container = createContainer(adapters);

	return {
		callerFor: (userId, clientIp = "203.0.113.1") => {
			const session = userId
				? ({
						user: { id: userId },
						session: { id: `session-${userId}` },
					} as NonNullable<Context["session"]>)
				: null;
			return createCaller({ session, container, clientIp });
		},
		quizzes,
		questions,
		versions,
		storage,
		games,
		players,
		answers,
		reports,
		realtime,
		clock,
		generator,
		sourceUploads,
		assignmentLanding,
		groups,
	};
}
