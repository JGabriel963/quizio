import { DEFAULT_AGENT_SETTINGS } from "@quizio/core/agents/domain/agent-settings";
import { FakeAccessKeySecrets } from "@quizio/core/agents/testing/fake-access-key-secrets";
import { FakeAgentTokenVerifier } from "@quizio/core/agents/testing/fake-agent-token-verifier";
import { InMemoryAccessKeyRepository } from "@quizio/core/agents/testing/in-memory-access-key-repository";
import { InMemoryAgentConnectionStore } from "@quizio/core/agents/testing/in-memory-agent-connection-store";
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
import { FakeAccountCredentials } from "@quizio/core/identity/testing/fake-account-credentials";
import { InMemoryAccountDeletionFeedback } from "@quizio/core/identity/testing/in-memory-account-deletion-feedback";
import { InMemoryAccountRepository } from "@quizio/core/identity/testing/in-memory-account-repository";
import type { LibraryQuizRecord } from "@quizio/core/library/application/ports/library-quiz-query";
import { InMemoryCreatorProfileQuery } from "@quizio/core/library/testing/in-memory-creator-profile-query";
import { InMemoryLibraryQuizQuery } from "@quizio/core/library/testing/in-memory-library-quiz-query";
import { FakeRemoteFiles } from "@quizio/core/media/testing/fake-remote-files";
import { InMemoryMediaUploads } from "@quizio/core/media/testing/in-memory-media-uploads";
import { InMemorySourceUploadRepository } from "@quizio/core/media/testing/in-memory-source-upload-repository";
import { FixedInboxChannels } from "@quizio/core/notifications/testing/fixed-inbox-channels";
import { InMemoryGroupNoticeRepository } from "@quizio/core/notifications/testing/in-memory-group-notice-repository";
import { InMemoryNotificationInbox } from "@quizio/core/notifications/testing/in-memory-notification-inbox";
import { InMemoryNotificationQuery } from "@quizio/core/notifications/testing/in-memory-notification-query";
import { DEFAULT_CREDIT_PRICING } from "@quizio/core/quiz/domain/generation-credits";
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
import { InMemoryProfilePhotoRepository } from "@quizio/core/shared/testing/in-memory-profile-photo-repository";
import { InMemoryRealtimePublisher } from "@quizio/core/shared/testing/in-memory-realtime-publisher";
import { SequentialIdGenerator } from "@quizio/core/shared/testing/sequential-id-generator";
import { InMemoryThemeFileUsage } from "@quizio/core/themes/testing/in-memory-theme-file-usage";
import { InMemoryThemeStore } from "@quizio/core/themes/testing/in-memory-theme-store";
import { type Adapters, type Container, createContainer } from "../container";
import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { appRouter } from "../routers/index";
import {
	testQuizShareGrants,
	testSharedQuizReads,
} from "./test-shared-quiz-reads";

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
	/** Images and photos sent; `use(key)` marks one in use (audit L4). */
	mediaUploads: InMemoryMediaUploads;
	/** Reads the games above; the reports' and creators' names are set here. */
	assignmentLanding: InMemoryAssignmentLandingQuery;
	/** Every groups port; add the accounts the screens name with `addUser`. */
	groups: InMemoryGroupStore;
	/** Accounts of spec 039, apart from the groups' users. */
	accounts: InMemoryAccountRepository;
	credentials: FakeAccountCredentials;
	profilePhotos: InMemoryProfilePhotoRepository;
	deletionFeedback: InMemoryAccountDeletionFeedback;
	creatorProfiles: InMemoryCreatorProfileQuery;
	/** Notifications given by hand (spec 040); the groups' signals go to realtime. */
	notificationQuery: InMemoryNotificationQuery;
	notificationInbox: InMemoryNotificationInbox;
	/** The same use cases the routers call, for the MCP server's tests (spec 044). */
	container: Container;
	accessKeys: InMemoryAccessKeyRepository;
	/** OAuth tokens the test issues by hand, and the consents behind them. */
	agentTokens: FakeAgentTokenVerifier;
	agentConnections: InMemoryAgentConnectionStore;
	/** The links an agent may give files by. */
	remoteFiles: FakeRemoteFiles;
	themes: InMemoryThemeStore;
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
	const mediaUploads = new InMemoryMediaUploads();
	const assignmentLanding = new InMemoryAssignmentLandingQuery(games, players);
	const groups = new InMemoryGroupStore();
	const accounts = new InMemoryAccountRepository();
	const credentials = new FakeAccountCredentials();
	const profilePhotos = new InMemoryProfilePhotoRepository();
	const deletionFeedback = new InMemoryAccountDeletionFeedback();
	const creatorProfiles = new InMemoryCreatorProfileQuery();
	const notificationInbox = new InMemoryNotificationInbox();
	const notificationQuery = new InMemoryNotificationQuery(notificationInbox);
	const themes = new InMemoryThemeStore(quizzes);
	const accessKeys = new InMemoryAccessKeyRepository();
	const agentTokens = new FakeAgentTokenVerifier();
	const agentConnections = new InMemoryAgentConnectionStore();
	const remoteFiles = new FakeRemoteFiles();
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
					themeId: quiz.themeId,
					// The custom theme's look now, as the database joins it.
					customTheme: themes.lookOf(quiz.customThemeId),
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
		mediaUploads,
		mediaUsage: mediaUploads,
		assistantSettings: {
			creditsPerDay: 20,
			instanceCreditsPerDay: 1000,
			pricing: DEFAULT_CREDIT_PRICING,
		},
		groups,
		groupMembers: groups,
		groupVisits: groups,
		groupReads: groups,
		inviteCodes: new SequentialInviteCodeGenerator(),
		groupPosts: groups,
		groupFeed: groups,
		groupUploads: groups,
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
		groupSharedQuizzes: groups,
		sharedQuizReads: testSharedQuizReads({ quizzes, versions, groups, games }),
		quizShareGrants: testQuizShareGrants(groups, quizzes),
		accounts,
		accountCredentials: credentials,
		profilePhotos,
		deletionFeedback,
		creatorProfiles,
		notificationQuery,
		notificationInbox,
		groupNotices: new InMemoryGroupNoticeRepository(),
		inboxChannels: new FixedInboxChannels(),
		notificationSettings: { readRetentionDays: 90 },
		customThemes: themes,
		themeUploads: themes,
		themeFileUsage: new InMemoryThemeFileUsage(),
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
		accessKeys,
		accessKeySecrets: new FakeAccessKeySecrets(),
		agentTokens,
		agentConnections,
		agentSettings: { ...DEFAULT_AGENT_SETTINGS },
		mcpServerUrl: "https://quizio.test/mcp",
		remoteFiles,
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
		mediaUploads,
		assignmentLanding,
		groups,
		accounts,
		credentials,
		profilePhotos,
		deletionFeedback,
		creatorProfiles,
		notificationQuery,
		notificationInbox,
		container,
		accessKeys,
		agentTokens,
		agentConnections,
		remoteFiles,
		themes,
	};
}
