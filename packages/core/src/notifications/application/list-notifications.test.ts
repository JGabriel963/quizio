import { describe, expect, it } from "vitest";
import type { GroupPostKind } from "../../groups/domain/group-post";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryProfilePhotoRepository } from "../../shared/testing/in-memory-profile-photo-repository";
import type { NotificationRecord } from "../domain/notification";
import { InMemoryNotificationInbox } from "../testing/in-memory-notification-inbox";
import { InMemoryNotificationQuery } from "../testing/in-memory-notification-query";
import { createListNotifications } from "./list-notifications";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-27T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

function aPost(id: string, at: Date, postKind: GroupPostKind = "message") {
	return {
		id: `post:${id}`,
		at,
		source: { kind: "post", postId: id, postKind },
		actor: { userId: "bruno", name: "Bruno" },
		group: { id: "g1", name: "GRUPO 1" },
		readAt: null,
	} satisfies NotificationRecord;
}

function setup() {
	const inbox = new InMemoryNotificationInbox();
	const query = new InMemoryNotificationQuery(inbox);
	const profilePhotos = new InMemoryProfilePhotoRepository();
	const list = createListNotifications({
		notificationQuery: query,
		notificationInbox: inbox,
		profilePhotos,
		storage: new InMemoryObjectStorage(),
		clock: new FixedClock(now),
		notificationSettings: { readRetentionDays: 90 },
	});
	return { inbox, query, profilePhotos, list };
}

describe("listNotifications (spec 040)", () => {
	it("lists newest first with headline, group, actor photo and age", async () => {
		const { query, profilePhotos, list } = setup();
		await profilePhotos.save("bruno", "profiles/bruno/b.webp");
		query.add("ana", aPost("old", ago(2 * DAY)));
		query.add("ana", aPost("new", ago(60_000), "quizzesShare"));
		query.add("ana", {
			id: "notice:n1",
			at: ago(DAY),
			source: { kind: "removed" },
			actor: null,
			group: { id: null, name: "GRUPO 2" },
			readAt: null,
		});

		const { items } = await list({ userId: "ana" });

		expect(items.map((item) => item.id)).toEqual([
			"post:new",
			"notice:n1",
			"post:old",
		]);
		expect(items[0]).toEqual({
			id: "post:new",
			kind: "quizzes",
			actor: {
				userId: "bruno",
				name: "Bruno",
				photoUrl: "https://media.test/profiles/bruno/b.webp",
			},
			group: { id: "g1", name: "GRUPO 1" },
			postId: "new",
			read: false,
			ageMs: 60_000,
		});
		expect(items[1]).toMatchObject({
			kind: "removed",
			actor: null,
			group: { id: null, name: "GRUPO 2" },
			postId: null,
		});
	});

	it("splits Novo and Anteriores by read", async () => {
		const { query, inbox, list } = setup();
		query.add("ana", aPost("a", ago(3 * DAY)));
		query.add("ana", aPost("b", ago(2 * DAY)));
		query.add("ana", aPost("c", ago(DAY)));
		await inbox.markRead("ana", "post:c", ago(1000));
		await inbox.markAllRead("ana", ago(2.5 * DAY));

		const { items } = await list({ userId: "ana" });

		expect(items.map((item) => [item.id, item.read])).toEqual([
			["post:c", true],
			["post:b", false],
			["post:a", true],
		]);
	});

	it("pages by a cursor: 20, then the rest, with no cap (Codex review of PR #23)", async () => {
		const { query, list } = setup();
		for (let index = 0; index < 250; index++) {
			query.add("ana", aPost(`p${index}`, ago(index * 60_000)));
		}

		const ids: string[] = [];
		let cursor: { at: Date; id: string } | undefined;
		let pages = 0;
		do {
			const page = await list({ userId: "ana", cursor });
			expect(page.items.length).toBeLessThanOrEqual(20);
			ids.push(...page.items.map((item) => item.id));
			cursor = page.nextCursor ?? undefined;
			pages++;
		} while (cursor);

		expect(pages).toBe(13);
		expect(ids).toHaveLength(250);
		expect(new Set(ids).size).toBe(250);
		expect(ids[0]).toBe("post:p0");
		expect(ids.at(-1)).toBe("post:p249");
	});

	it("hasUnread is inbox-wide, beyond the page (Codex review of PR #23)", async () => {
		const { query, inbox, list } = setup();
		query.add("ana", aPost("old-unread", ago(30 * DAY)));
		for (let index = 0; index < 20; index++) {
			query.add("ana", aPost(`read${index}`, ago(index * 60_000)));
			await inbox.markRead("ana", `post:read${index}`, ago(1000));
		}

		const page = await list({ userId: "ana" });
		expect(page.items.every((item) => item.read)).toBe(true);
		expect(page.hasUnread).toBe(true);

		await inbox.markAllRead("ana", now);
		expect((await list({ userId: "ana" })).hasUnread).toBe(false);
	});

	it("drops read ones past the retention", async () => {
		const { query, inbox, list } = setup();
		query.add("ana", aPost("read-old", ago(91 * DAY)));
		query.add("ana", aPost("unread-old", ago(91 * DAY)));
		await inbox.markRead("ana", "post:read-old", ago(DAY));

		const { items } = await list({ userId: "ana" });

		expect(items.map((item) => item.id)).toEqual(["post:unread-old"]);
	});
});
