import { authSettings } from "@quizio/auth";
import { db } from "@quizio/db";
import { createDrizzleAnswerRepository } from "@quizio/db/repositories/game/drizzle-answer-repository";
import { createDrizzleGameQuestionRepository } from "@quizio/db/repositories/game/drizzle-game-question-repository";
import { createDrizzleGameRepository } from "@quizio/db/repositories/game/drizzle-game-repository";
import { createDrizzleHostPreferencesRepository } from "@quizio/db/repositories/game/drizzle-host-preferences-repository";
import { createDrizzlePlayableQuizQuery } from "@quizio/db/repositories/game/drizzle-playable-quiz-query";
import { createDrizzlePlayerRepository } from "@quizio/db/repositories/game/drizzle-player-repository";
import { createDrizzleLibraryQuizQuery } from "@quizio/db/repositories/library/drizzle-library-quiz-query";
import { createDrizzleQuestionRepository } from "@quizio/db/repositories/quiz/drizzle-question-repository";
import { createDrizzleQuizRepository } from "@quizio/db/repositories/quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "@quizio/db/repositories/quiz/drizzle-quiz-version-repository";
import { createDrizzleAttemptLimiter } from "@quizio/db/repositories/shared/drizzle-attempt-limiter";
import { env } from "@quizio/env/server";
import { createPusherRealtimePublisher } from "@quizio/realtime/pusher-realtime-publisher";
import { createS3ObjectStorage } from "@quizio/storage/s3-object-storage";

import { type Adapters, type Container, createContainer } from "./container";
import { createRandomGamePinGenerator } from "./random-game-pin-generator";
import { createRandomShuffler } from "./random-shuffler";

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
		playableQuizzes: createDrizzlePlayableQuizQuery(db),
		preferences: createDrizzleHostPreferencesRepository(db),
		pins: createRandomGamePinGenerator(),
		shuffler: createRandomShuffler(),
		attempts: createDrizzleAttemptLimiter(db),
		authSettings,
	};
}

let container: Container | undefined;

/** Lazily built once per server instance (one per warm serverless function). */
export function getContainer(): Container {
	container ??= createContainer(createAdaptersFromEnv());
	return container;
}
