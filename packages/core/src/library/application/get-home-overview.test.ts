import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryLibraryQuizQuery } from "../testing/in-memory-library-quiz-query";
import { createGetHomeOverview } from "./get-home-overview";
import type { LibraryQuizRecord } from "./ports/library-quiz-query";

const day = (n: number) =>
	new Date(`2026-01-${String(n).padStart(2, "0")}T10:00:00.000Z`);

function aRecord(
	overrides: Partial<LibraryQuizRecord> = {},
): LibraryQuizRecord {
	return {
		id: "quiz-1",
		ownerId: "user-1",
		title: "Bom de Bíblia (Junho)",
		searchTitle: "bom de biblia (junho)",
		coverImageKey: null,
		visibility: "private",
		status: "draft",
		questionCount: 0,
		updatedAt: day(1),
		trashedAt: null,
		...overrides,
	};
}

function homeOverviewOver(records: LibraryQuizRecord[]) {
	return createGetHomeOverview({
		libraryQuizzes: new InMemoryLibraryQuizQuery(() => records),
		storage: new InMemoryObjectStorage("https://media.test"),
	});
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("getHomeOverview", () => {
	it("returns the six most recently updated quizzes with the total", async () => {
		const records = Array.from({ length: 8 }, (_, index) =>
			aRecord({ id: `quiz-${index + 1}`, updatedAt: day(index + 1) }),
		);

		const overview = await homeOverviewOver(records)({ ownerId: "user-1" });

		expect(ids(overview.quizzes)).toEqual([
			"quiz-8",
			"quiz-7",
			"quiz-6",
			"quiz-5",
			"quiz-4",
			"quiz-3",
		]);
		expect(overview.totalQuizCount).toBe(8);
	});

	it("leaves trashed quizzes out of the list and of the total", async () => {
		const overview = await homeOverviewOver([
			aRecord({ id: "kept", updatedAt: day(1) }),
			aRecord({ id: "trashed", updatedAt: day(5), trashedAt: day(6) }),
		])({ ownerId: "user-1" });

		expect(ids(overview.quizzes)).toEqual(["kept"]);
		expect(overview.totalQuizCount).toBe(1);
	});

	it("returns an empty list and a zero total for a creator with no quizzes", async () => {
		const overview = await homeOverviewOver([])({ ownerId: "user-1" });

		expect(overview).toEqual({ quizzes: [], totalQuizCount: 0 });
	});

	it("resolves cover URLs and keeps missing covers null", async () => {
		const overview = await homeOverviewOver([
			aRecord({
				id: "with-cover",
				updatedAt: day(2),
				coverImageKey: "media/user-1/cover.png",
			}),
			aRecord({ id: "without-cover", updatedAt: day(1) }),
		])({ ownerId: "user-1" });

		expect(overview.quizzes.map((quiz) => quiz.coverImageUrl)).toEqual([
			"https://media.test/media/user-1/cover.png",
			null,
		]);
	});

	it("never returns another creator's quizzes", async () => {
		const overview = await homeOverviewOver([
			aRecord({ id: "mine" }),
			aRecord({ id: "theirs", ownerId: "user-2", updatedAt: day(9) }),
		])({ ownerId: "user-1" });

		expect(ids(overview.quizzes)).toEqual(["mine"]);
		expect(overview.totalQuizCount).toBe(1);
	});
});
