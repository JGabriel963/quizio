import { InMemoryQuizRepository } from "../../quiz/testing/in-memory-quiz-repository";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { InMemoryThemeFileUsage } from "./in-memory-theme-file-usage";
import { InMemoryThemeStore } from "./in-memory-theme-store";

/** Every port the themes use cases take, over fakes. */
export function themesTestDeps() {
	const quizzes = new InMemoryQuizRepository();
	const store = new InMemoryThemeStore(quizzes);
	const storage = new InMemoryObjectStorage();
	const clock = new FixedClock("2026-10-28T12:00:00.000Z");
	const fileUsage = new InMemoryThemeFileUsage();
	const deps = {
		themes: store,
		themeUploads: store,
		fileUsage,
		storage,
		clock,
		ids: new SequentialIdGenerator("theme"),
		attempts: new InMemoryAttemptLimiter(),
	};
	/** A pending upload the browser already sent. */
	async function uploaded(key: string, ownerId = "owner-1") {
		storage.simulateUpload(key);
		await store.addThemeUpload({ key, ownerId, createdAt: clock.now() });
		return key;
	}
	return { deps, quizzes, store, storage, clock, fileUsage, uploaded };
}
