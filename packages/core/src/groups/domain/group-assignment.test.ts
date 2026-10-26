import { describe, expect, it } from "vitest";

import {
	attachmentOf,
	type GroupAssignmentRecord,
	isAssignmentOpen,
	sortGroupAssignments,
} from "./group-assignment";

const now = new Date("2026-10-26T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function aRecord(
	overrides: Partial<GroupAssignmentRecord> = {},
): GroupAssignmentRecord {
	return {
		gameId: "game-1",
		ownerId: "ana",
		ownerName: "Ana",
		name: "Capitais",
		questionCount: 5,
		coverImageKey: null,
		expiresAt: new Date(now.getTime() + 72 * HOUR),
		endedAt: null,
		...overrides,
	};
}

describe("a group's assignment (spec 038)", () => {
	it("an open assignment has an attachment with the time left", () => {
		const record = aRecord({ coverImageKey: "media/ana/c.png" });

		expect(isAssignmentOpen(record, now)).toBe(true);
		expect(attachmentOf(record, now)).toEqual({
			gameId: "game-1",
			name: "Capitais",
			questionCount: 5,
			coverImageKey: "media/ana/c.png",
			ownerName: "Ana",
			remainingMs: 72 * HOUR,
		});
	});

	it("an ended, expired or missing assignment has none (RN-16)", () => {
		const ended = aRecord({ endedAt: new Date(now.getTime() - HOUR) });
		const expired = aRecord({ expiresAt: now });

		expect(isAssignmentOpen(ended, now)).toBe(false);
		expect(attachmentOf(ended, now)).toBeNull();
		expect(attachmentOf(expired, now)).toBeNull();
		expect(attachmentOf(null, now)).toBeNull();
	});

	it("sorts by recent, oldest and deadline (RN-22)", () => {
		const items = [
			{ id: "a", assignedAt: new Date(1000), remainingMs: 3 * HOUR },
			{ id: "b", assignedAt: new Date(3000), remainingMs: 1 * HOUR },
			{ id: "c", assignedAt: new Date(2000), remainingMs: 2 * HOUR },
		];
		const ids = (sorted: typeof items) => sorted.map((item) => item.id);

		expect(ids(sortGroupAssignments(items, "recent"))).toEqual(["b", "c", "a"]);
		expect(ids(sortGroupAssignments(items, "oldest"))).toEqual(["a", "c", "b"]);
		expect(ids(sortGroupAssignments(items, "deadline"))).toEqual([
			"b",
			"c",
			"a",
		]);
	});
});
