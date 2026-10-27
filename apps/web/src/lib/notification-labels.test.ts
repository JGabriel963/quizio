import { describe, expect, it } from "vitest";

import type { NotificationData } from "@/lib/api-types";

import {
	notificationDestination,
	notificationText,
} from "./notification-labels";

function aNotification(overrides: Partial<NotificationData>): NotificationData {
	return {
		id: "post:p1",
		kind: "post",
		actor: { userId: "bruno", name: "Bruno", photoUrl: null },
		group: { id: "g1", name: "GRUPO 1" },
		postId: "p1",
		read: false,
		ageMs: 0,
		...overrides,
	};
}

/** The sentence as the panel reads it, bold parts included. */
const sentence = (notification: NotificationData) => {
	const { actor, before, group, after } = notificationText(notification);
	return `${actor ? `${actor} ` : ""}${before}${group}${after}`;
};

describe("notification texts and destinations (spec 040)", () => {
	it("texts of a post, a quiz, quizzes, an assignment, a join, a removal and a deletion", () => {
		expect(sentence(aNotification({ kind: "post" }))).toBe(
			"Bruno compartilhou uma nova postagem com o grupo GRUPO 1.",
		);
		expect(sentence(aNotification({ kind: "quiz" }))).toBe(
			"Bruno compartilhou um novo kahoot com o grupo GRUPO 1.",
		);
		expect(sentence(aNotification({ kind: "quizzes" }))).toBe(
			"Bruno compartilhou novos kahoots com o grupo GRUPO 1.",
		);
		expect(sentence(aNotification({ kind: "assignment" }))).toBe(
			"Bruno atribuiu um kahoot ao grupo GRUPO 1.",
		);
		expect(sentence(aNotification({ kind: "joined", postId: null }))).toBe(
			"Bruno entrou no grupo GRUPO 1.",
		);
		const notice = {
			actor: null,
			postId: null,
			group: { id: null, name: "GRUPO 1" },
		};
		expect(sentence(aNotification({ kind: "removed", ...notice }))).toBe(
			"Você foi removido do grupo GRUPO 1.",
		);
		expect(sentence(aNotification({ kind: "groupDeleted", ...notice }))).toBe(
			"O grupo GRUPO 1 foi excluído.",
		);
	});

	it("where each one goes: the post page, the members, nowhere", () => {
		expect(notificationDestination(aNotification({ kind: "quiz" }))).toEqual({
			to: "post",
			groupId: "g1",
			postId: "p1",
		});
		expect(
			notificationDestination(aNotification({ kind: "joined", postId: null })),
		).toEqual({ to: "members", groupId: "g1" });
		expect(
			notificationDestination(
				aNotification({
					kind: "removed",
					actor: null,
					postId: null,
					group: { id: null, name: "GRUPO 1" },
				}),
			),
		).toBeNull();
	});
});
