import { describe, expect, it } from "vitest";

import {
	hasNews,
	isKept,
	isRead,
	type NotificationRecord,
	notificationIdOf,
	postHeadlineKind,
} from "./notification";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-27T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

function aNotification(
	overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
	return {
		id: "post:p1",
		at: ago(DAY),
		source: { kind: "post", postId: "p1", postKind: "message" },
		actor: { userId: "bruno", name: "Bruno" },
		group: { id: "g1", name: "GRUPO 1" },
		readAt: null,
		...overrides,
	};
}

describe("notification (spec 040)", () => {
	it("isRead: read row or before readAllAt", () => {
		expect(isRead(aNotification(), null)).toBe(false);
		expect(isRead(aNotification({ readAt: ago(1000) }), null)).toBe(true);
		expect(isRead(aNotification({ at: ago(DAY) }), ago(1000))).toBe(true);
		expect(isRead(aNotification({ at: ago(1000) }), ago(DAY))).toBe(false);
	});

	it("isKept: a read notification older than the retention goes, an unread one stays", () => {
		const retention = 90 * DAY;
		const old = ago(91 * DAY);

		expect(isKept(aNotification({ at: old }), null, now, retention)).toBe(true);
		expect(
			isKept(
				aNotification({ at: old, readAt: ago(DAY) }),
				null,
				now,
				retention,
			),
		).toBe(false);
		expect(isKept(aNotification({ at: old }), ago(DAY), now, retention)).toBe(
			false,
		);
		expect(
			isKept(
				aNotification({ at: ago(89 * DAY), readAt: ago(DAY) }),
				null,
				now,
				retention,
			),
		).toBe(true);
	});

	it("hasNews: something newer than seenAt, or anything when never seen", () => {
		expect(hasNews(null, null)).toBe(false);
		expect(hasNews(ago(1000), null)).toBe(true);
		expect(hasNews(ago(1000), ago(DAY))).toBe(true);
		expect(hasNews(ago(DAY), ago(1000))).toBe(false);
	});

	it("postHeadlineKind: message is post, quizShare quiz, quizzesShare quizzes, assignment assignment", () => {
		expect(postHeadlineKind("message")).toBe("post");
		expect(postHeadlineKind("quizShare")).toBe("quiz");
		expect(postHeadlineKind("quizzesShare")).toBe("quizzes");
		expect(postHeadlineKind("assignment")).toBe("assignment");
	});

	it("notification ids: post:, join: with the join time, notice:", () => {
		expect(notificationIdOf({ kind: "post", postId: "p1" })).toBe("post:p1");
		expect(
			notificationIdOf({
				kind: "joined",
				groupId: "g1",
				userId: "davi",
				joinedAt: new Date(1_000),
			}),
		).toBe("join:g1:davi:1000");
		expect(notificationIdOf({ kind: "notice", noticeId: "n1" })).toBe(
			"notice:n1",
		);
	});
});
