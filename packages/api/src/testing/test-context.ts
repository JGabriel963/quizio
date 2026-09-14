import type { LibraryQuizRecord } from "@quizio/core/library/application/ports/library-quiz-query";
import { InMemoryLibraryQuizQuery } from "@quizio/core/library/testing/in-memory-library-quiz-query";
import type { Quiz } from "@quizio/core/quiz/domain/quiz";
import { quizSearchText } from "@quizio/core/quiz/domain/quiz-details";
import { InMemoryQuizRepository } from "@quizio/core/quiz/testing/in-memory-quiz-repository";
import { FixedClock } from "@quizio/core/shared/testing/fixed-clock";
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
	/** Calls procedures as that signed-in creator, or as a visitor with `null`. */
	callerFor(userId: string | null): TestApiCaller;
	quizzes: InMemoryQuizRepository;
	storage: InMemoryObjectStorage;
}

function toLibraryRecord(quiz: Quiz): LibraryQuizRecord {
	const { description: _description, createdAt: _createdAt, ...record } = quiz;
	return {
		...record,
		searchTitle: quizSearchText(quiz.title),
		questionCount: 0,
	};
}

/** Real routers and use cases over in-memory adapters. */
export function createTestApi(overrides: Partial<Adapters> = {}): TestApi {
	const quizzes = new InMemoryQuizRepository();
	const storage = new InMemoryObjectStorage("https://media.test");
	const adapters: Adapters = {
		storage,
		realtime: new InMemoryRealtimePublisher(),
		ids: new SequentialIdGenerator("id"),
		clock: new FixedClock("2026-06-01T12:00:00.000Z"),
		quizzes,
		libraryQuizzes: new InMemoryLibraryQuizQuery(() =>
			quizzes.all().map(toLibraryRecord),
		),
		authSettings: { signUpEnabled: true, googleEnabled: false },
		...overrides,
	};
	const container = createContainer(adapters);

	return {
		callerFor: (userId) => {
			const session = userId
				? ({
						user: { id: userId },
						session: { id: `session-${userId}` },
					} as NonNullable<Context["session"]>)
				: null;
			return createCaller({ session, container });
		},
		quizzes,
		storage,
	};
}
