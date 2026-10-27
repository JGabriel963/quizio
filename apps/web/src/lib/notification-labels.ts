import type { NotificationData } from "@/lib/api-types";

/** The sentence in parts, so the panel bolds the name and the group (RN-14). */
export interface NotificationText {
	actor: string | null;
	before: string;
	group: string;
	after: string;
}

/** What each notification says (spec 040, RN-02 to RN-06). */
export function notificationText(
	notification: NotificationData,
): NotificationText {
	const actor = notification.actor?.name ?? null;
	const group = notification.group.name;
	switch (notification.kind) {
		case "post":
			return {
				actor,
				before: "compartilhou uma nova postagem com o grupo ",
				group,
				after: ".",
			};
		case "quiz":
			return {
				actor,
				before: "compartilhou um novo kahoot com o grupo ",
				group,
				after: ".",
			};
		case "quizzes":
			return {
				actor,
				before: "compartilhou novos kahoots com o grupo ",
				group,
				after: ".",
			};
		case "assignment":
			return {
				actor,
				before: "atribuiu um kahoot ao grupo ",
				group,
				after: ".",
			};
		case "joined":
			return { actor, before: "entrou no grupo ", group, after: "." };
		case "removed":
			return {
				actor: null,
				before: "Você foi removido do grupo ",
				group,
				after: ".",
			};
		case "groupDeleted":
			return {
				actor: null,
				before: "O grupo ",
				group,
				after: " foi excluído.",
			};
	}
}

export type NotificationDestination =
	| { to: "post"; groupId: string; postId: string }
	| { to: "members"; groupId: string }
	| null;

/**
 * Where opening it leads (RN-17): the post's page, the group's members for a
 * join, and nowhere for a removal or a deletion, which only get read.
 */
export function notificationDestination(
	notification: NotificationData,
): NotificationDestination {
	const groupId = notification.group.id;
	if (!groupId) {
		return null;
	}
	if (notification.postId) {
		return { to: "post", groupId, postId: notification.postId };
	}
	return notification.kind === "joined" ? { to: "members", groupId } : null;
}
