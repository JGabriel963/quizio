import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryLibraryQuizQuery } from "../testing/in-memory-library-quiz-query";
import { createListLibrary } from "./list-library";
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

function listLibraryOver(records: LibraryQuizRecord[]) {
	return createListLibrary({
		libraryQuizzes: new InMemoryLibraryQuizQuery(() => records),
		storage: new InMemoryObjectStorage("https://media.test"),
	});
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("listLibrary", () => {
	const records = [
		aRecord({ id: "older", updatedAt: day(1) }),
		aRecord({ id: "newer", updatedAt: day(3) }),
		aRecord({ id: "trashed-first", updatedAt: day(5), trashedAt: day(6) }),
		aRecord({ id: "trashed-last", updatedAt: day(2), trashedAt: day(8) }),
		aRecord({ id: "foreign", ownerId: "user-2", updatedAt: day(9) }),
	];

	it("recent lists non-trashed quizzes by updatedAt desc", async () => {
		const items = await listLibraryOver(records)({
			ownerId: "user-1",
			section: "recent",
		});

		expect(ids(items)).toEqual(["newer", "older"]);
	});

	it("drafts lists non-trashed drafts", async () => {
		const items = await listLibraryOver(records)({
			ownerId: "user-1",
			section: "drafts",
		});

		expect(ids(items)).toEqual(["newer", "older"]);
	});

	it("trash lists trashed quizzes by trashedAt desc", async () => {
		const items = await listLibraryOver(records)({
			ownerId: "user-1",
			section: "trash",
		});

		expect(ids(items)).toEqual(["trashed-last", "trashed-first"]);
	});

	it("filters by the normalized search text", async () => {
		const items = await listLibraryOver([
			aRecord({
				id: "junho",
				searchTitle: "bom de biblia (junho)",
				updatedAt: day(2),
			}),
			aRecord({ id: "kids", searchTitle: "biblia kids", updatedAt: day(1) }),
			aRecord({ id: "geo", searchTitle: "geografia" }),
			aRecord({ id: "untitled", title: null, searchTitle: "quiz sem titulo" }),
		])({ ownerId: "user-1", section: "recent", search: "  BÍBLIA " });

		expect(ids(items)).toEqual(["junho", "kids"]);
	});

	it("lists everything when the search is blank", async () => {
		const items = await listLibraryOver(records)({
			ownerId: "user-1",
			section: "recent",
			search: "   ",
		});

		expect(ids(items)).toEqual(["newer", "older"]);
	});

	it("never returns another owner's quizzes", async () => {
		const items = await listLibraryOver(records)({
			ownerId: "user-2",
			section: "recent",
		});

		expect(ids(items)).toEqual(["foreign"]);
	});

	it("returns an empty list for an empty trash", async () => {
		const items = await listLibraryOver([aRecord()])({
			ownerId: "user-1",
			section: "trash",
		});

		expect(items).toEqual([]);
	});

	it("maps cover keys to public URLs and hides internal fields", async () => {
		const [item] = await listLibraryOver([
			aRecord({ coverImageKey: "media/user-1/cover.png" }),
		])({ ownerId: "user-1", section: "recent" });

		expect(item).toEqual({
			id: "quiz-1",
			title: "Bom de Bíblia (Junho)",
			coverImageUrl: "https://media.test/media/user-1/cover.png",
			visibility: "private",
			status: "draft",
			questionCount: 0,
			updatedAt: day(1),
			trashedAt: null,
		});
	});
});
