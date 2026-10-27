import { createLanguageModel } from "@quizio/ai/ai-model";
import { createAiSdkQuestionGenerator } from "@quizio/ai/ai-sdk-question-generator";
import { createPdfLibPdfPages } from "@quizio/ai/pdf-lib-pdf-pages";
import { auth, authSettings } from "@quizio/auth";
import { createBetterAuthAccountCredentials } from "@quizio/auth/account-credentials";
import type { QuestionGenerator } from "@quizio/core/quiz/application/ports/question-generator";
import { InMemoryQuestionGenerator } from "@quizio/core/quiz/testing/in-memory-question-generator";
import { db } from "@quizio/db";
import { createDrizzleAnswerRepository } from "@quizio/db/repositories/game/drizzle-answer-repository";
import { createDrizzleAssignmentLandingQuery } from "@quizio/db/repositories/game/drizzle-assignment-landing-query";
import { createDrizzleAssignmentPreferencesRepository } from "@quizio/db/repositories/game/drizzle-assignment-preferences-repository";
import { createDrizzleGameQuestionRepository } from "@quizio/db/repositories/game/drizzle-game-question-repository";
import { createDrizzleGameRepository } from "@quizio/db/repositories/game/drizzle-game-repository";
import { createDrizzleHostPreferencesRepository } from "@quizio/db/repositories/game/drizzle-host-preferences-repository";
import { createDrizzlePlayableQuizQuery } from "@quizio/db/repositories/game/drizzle-playable-quiz-query";
import { createDrizzlePlayerRepository } from "@quizio/db/repositories/game/drizzle-player-repository";
import { createDrizzleReviewResultsWriter } from "@quizio/db/repositories/game/drizzle-review-results-writer";
import { createDrizzleGroupAssignmentQuery } from "@quizio/db/repositories/groups/drizzle-group-assignment-query";
import { createDrizzleGroupFeedQuery } from "@quizio/db/repositories/groups/drizzle-group-feed-query";
import { createDrizzleGroupMemberRepository } from "@quizio/db/repositories/groups/drizzle-group-member-repository";
import { createDrizzleGroupPostRepository } from "@quizio/db/repositories/groups/drizzle-group-post-repository";
import { createDrizzleGroupReads } from "@quizio/db/repositories/groups/drizzle-group-reads";
import { createDrizzleGroupRepository } from "@quizio/db/repositories/groups/drizzle-group-repository";
import { createDrizzleGroupSharedQuizRepository } from "@quizio/db/repositories/groups/drizzle-group-shared-quiz-repository";
import { createDrizzleGroupUploadRepository } from "@quizio/db/repositories/groups/drizzle-group-upload-repository";
import { createDrizzleGroupVisitRepository } from "@quizio/db/repositories/groups/drizzle-group-visit-repository";
import { createDrizzleSharedQuizReads } from "@quizio/db/repositories/groups/drizzle-shared-quiz-reads";
import { createDrizzleAccountDeletionFeedback } from "@quizio/db/repositories/identity/drizzle-account-deletion-feedback";
import { createDrizzleAccountRepository } from "@quizio/db/repositories/identity/drizzle-account-repository";
import { createDrizzleProfilePhotoRepository } from "@quizio/db/repositories/identity/drizzle-profile-photo-repository";
import { createDrizzleCreatorProfileQuery } from "@quizio/db/repositories/library/drizzle-creator-profile-query";
import { createDrizzleLibraryQuizQuery } from "@quizio/db/repositories/library/drizzle-library-quiz-query";
import { createDrizzleSourceUploadRepository } from "@quizio/db/repositories/media/drizzle-source-upload-repository";
import { createDrizzleAssistantPreferencesRepository } from "@quizio/db/repositories/quiz/drizzle-assistant-preferences-repository";
import { createDrizzleGenerationQuota } from "@quizio/db/repositories/quiz/drizzle-generation-quota";
import { createDrizzleQuestionRepository } from "@quizio/db/repositories/quiz/drizzle-question-repository";
import { createDrizzleQuizRepository } from "@quizio/db/repositories/quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "@quizio/db/repositories/quiz/drizzle-quiz-version-repository";
import { createDrizzleReportGameQuery } from "@quizio/db/repositories/reports/drizzle-report-game-query";
import { createDrizzleReportReadGrants } from "@quizio/db/repositories/reports/drizzle-report-read-grants";
import { createDrizzleReportRepository } from "@quizio/db/repositories/reports/drizzle-report-repository";
import { createDrizzleAttemptLimiter } from "@quizio/db/repositories/shared/drizzle-attempt-limiter";
import { createDrizzleQuizShareGrants } from "@quizio/db/repositories/shared/drizzle-quiz-share-grants";
import { env } from "@quizio/env/server";
import { createPusherRealtimePublisher } from "@quizio/realtime/pusher-realtime-publisher";
import { createS3ObjectStorage } from "@quizio/storage/s3-object-storage";

import { type Adapters, type Container, createContainer } from "./container";
import { createRandomAssignmentPinGenerator } from "./random-assignment-pin-generator";
import { createRandomGamePinGenerator } from "./random-game-pin-generator";
import { createRandomInviteCodeGenerator } from "./random-invite-code-generator";
import { createRandomShuffler } from "./random-shuffler";

/** A creation taking longer than this fails and gives the use back (spec 027, RN-33). */
const GENERATION_TIMEOUT_MS = 120_000;

/** The creation assistant's model, or null to turn the assistant off (spec 027, RN-01). */
function questionGeneratorFromEnv(): QuestionGenerator | null {
	const { AI_PROVIDER: provider, AI_API_KEY: apiKey, AI_MODEL: model } = env;
	if (!provider) {
		return null;
	}
	if (provider === "fake") {
		if (env.NODE_ENV === "production") {
			throw new Error("AI_PROVIDER=fake is only for tests");
		}
		return new InMemoryQuestionGenerator();
	}
	if (!apiKey || !model) {
		throw new Error(
			`Set AI_API_KEY and AI_MODEL to use AI_PROVIDER=${provider}`,
		);
	}
	return createAiSdkQuestionGenerator({
		model: createLanguageModel({ provider, apiKey, model }),
		timeoutMs: GENERATION_TIMEOUT_MS,
	});
}

/**
 * The only place that knows which concrete provider backs each port.
 * Changing R2 → another S3 provider, or Pusher → another realtime service,
 * means changing an adapter here — use cases and routers stay untouched.
 */
export function createAdaptersFromEnv(): Adapters {
	return {
		storage: createS3ObjectStorage({
			endpoint: env.STORAGE_ENDPOINT,
			region: env.STORAGE_REGION,
			accessKeyId: env.STORAGE_ACCESS_KEY_ID,
			secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
			bucket: env.STORAGE_BUCKET,
			publicBaseUrl: env.STORAGE_PUBLIC_URL,
			forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
		}),
		realtime: createPusherRealtimePublisher({
			appId: env.PUSHER_APP_ID,
			key: env.PUSHER_KEY,
			secret: env.PUSHER_SECRET,
			cluster: env.PUSHER_CLUSTER,
			host: env.PUSHER_HOST,
			port: env.PUSHER_PORT,
			useTLS: env.PUSHER_USE_TLS,
		}),
		ids: { generate: () => crypto.randomUUID() },
		clock: { now: () => new Date() },
		quizzes: createDrizzleQuizRepository(db),
		questions: createDrizzleQuestionRepository(db),
		versions: createDrizzleQuizVersionRepository(db),
		libraryQuizzes: createDrizzleLibraryQuizQuery(db),
		games: createDrizzleGameRepository(db),
		players: createDrizzlePlayerRepository(db),
		gameQuestions: createDrizzleGameQuestionRepository(db),
		answers: createDrizzleAnswerRepository(db),
		reviewResults: createDrizzleReviewResultsWriter(db),
		playableQuizzes: createDrizzlePlayableQuizQuery(db),
		preferences: createDrizzleHostPreferencesRepository(db),
		reportGames: createDrizzleReportGameQuery(db),
		reports: createDrizzleReportRepository(db),
		pins: createRandomGamePinGenerator(),
		assignmentPins: createRandomAssignmentPinGenerator(),
		assignmentPreferences: createDrizzleAssignmentPreferencesRepository(db),
		assignmentLanding: createDrizzleAssignmentLandingQuery(db),
		groups: createDrizzleGroupRepository(db),
		groupMembers: createDrizzleGroupMemberRepository(db),
		groupVisits: createDrizzleGroupVisitRepository(db),
		groupReads: createDrizzleGroupReads(db),
		inviteCodes: createRandomInviteCodeGenerator(),
		groupPosts: createDrizzleGroupPostRepository(db),
		groupFeed: createDrizzleGroupFeedQuery(db),
		groupUploads: createDrizzleGroupUploadRepository(db),
		groupAssignmentQuery: createDrizzleGroupAssignmentQuery(db),
		reportReadGrants: createDrizzleReportReadGrants(db),
		groupSharedQuizzes: createDrizzleGroupSharedQuizRepository(db),
		sharedQuizReads: createDrizzleSharedQuizReads(db),
		quizShareGrants: createDrizzleQuizShareGrants(db),
		assignmentSettings: {
			maxDeadlineDays: env.ASSIGNMENT_MAX_DEADLINE_DAYS,
		},
		shuffler: createRandomShuffler(),
		attempts: createDrizzleAttemptLimiter(db),
		authSettings,
		questionGenerator: questionGeneratorFromEnv(),
		pdfPages: createPdfLibPdfPages(),
		generationQuota: createDrizzleGenerationQuota(db),
		assistantPreferences: createDrizzleAssistantPreferencesRepository(db),
		sourceUploads: createDrizzleSourceUploadRepository(db),
		assistantSettings: { generationsPerDay: env.AI_GENERATIONS_PER_DAY },
		accounts: createDrizzleAccountRepository(db),
		accountCredentials: createBetterAuthAccountCredentials(auth),
		profilePhotos: createDrizzleProfilePhotoRepository(db),
		deletionFeedback: createDrizzleAccountDeletionFeedback(db),
		creatorProfiles: createDrizzleCreatorProfileQuery(db),
	};
}

/** The header the proxy in front of this instance reports the caller's address in. */
export const clientIpHeader = env.CLIENT_IP_HEADER;

let container: Container | undefined;

/** Lazily built once per server instance (one per warm serverless function). */
export function getContainer(): Container {
	container ??= createContainer(createAdaptersFromEnv());
	return container;
}
