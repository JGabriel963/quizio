import { describe, expect, it } from "vitest";

import type { LibraryQuizRecord } from "../application/ports/library-quiz-query";
import { InMemoryLibraryQuizQuery } from "./in-memory-library-quiz-query";

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

const records = [
	aRecord({ id: "a", updatedAt: day(1) }),
	aRecord({ id: "b", updatedAt: day(2) }),
	aRecord({ id: "c", updatedAt: day(3) }),
	aRecord({ id: "trashed", updatedAt: day(9), trashedAt: day(9) }),
	aRecord({ id: "foreign", ownerId: "user-2", updatedAt: day(9) }),
];

const queryOver = (source: LibraryQuizRecord[] = records) =>
	new InMemoryLibraryQuizQuery(() => source);

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("InMemoryLibraryQuizQuery", () => {
	it("returns only the newest records up to the limit", async () => {
		const items = await queryOver().list({
			ownerId: "user-1",
			section: "recent",
			searchText: null,
			limit: 2,
		});

		expect(ids(items)).toEqual(["c", "b"]);
	});

	it("lists the whole section when no limit is given", async () => {
		const items = await queryOver().list({
			ownerId: "user-1",
			section: "recent",
			searchText: null,
		});

		expect(ids(items)).toEqual(["c", "b", "a"]);
	});

	it("counts every match ignoring the limit", async () => {
		const total = await queryOver().count({
			ownerId: "user-1",
			section: "recent",
			searchText: null,
			limit: 1,
		});

		expect(total).toBe(3);
	});

	it("counts only what the same criteria would list", async () => {
		const query = queryOver();

		await expect(
			query.count({ ownerId: "user-1", section: "trash", searchText: null }),
		).resolves.toBe(1);
		await expect(
			query.count({
				ownerId: "user-1",
				section: "recent",
				searchText: "biblia",
			}),
		).resolves.toBe(3);
	});

	it("counts zero when nothing matches", async () => {
		const total = await queryOver([]).count({
			ownerId: "user-1",
			section: "recent",
			searchText: null,
		});

		expect(total).toBe(0);
	});
});
