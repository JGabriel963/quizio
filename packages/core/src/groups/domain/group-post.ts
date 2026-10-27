import { characterCount } from "../../shared/domain/text-length";
import { EmptyPostError, InvalidPostMessageError } from "./group-errors";
import type { GroupPostFile } from "./group-file";

/** As "Criar publicação" counts it (spec 036, RN-05; spec 038, RN-12). */
export const GROUP_POST_MESSAGE_MAX_LENGTH = 500;

/**
 * An assignment of spec 038, what a member wrote (spec 036), or one or
 * several quizzes shared with the group (spec 037).
 */
export const GROUP_POST_KINDS = [
	"assignment",
	"message",
	"quizShare",
	"quizzesShare",
] as const;
export type GroupPostKind = (typeof GROUP_POST_KINDS)[number];

/**
 * An item of the group's feed (ADR 0016). An assignment's post points at the
 * game by id, which may end or be deleted meanwhile; a message may carry one
 * file (ADR 0017), never with a game (spec 036, RN-07).
 */
export interface GroupPost {
	id: string;
	groupId: string;
	authorId: string;
	kind: GroupPostKind;
	message: string | null;
	gameId: string | null;
	file: GroupPostFile | null;
	/**
	 * The share of a `quizShare` post, not the quiz: removed and shared again,
	 * the quiz does not come back to the old post (spec 037, RN-13).
	 */
	sharedQuizId: string | null;
	createdAt: Date;
}

/**
 * 0 to 500 characters; the line breaks stay, the ends' spaces go, and nothing
 * left is no message (spec 036, RN-05).
 */
export function parseOptionalPostMessage(raw: string): string | null {
	const message = raw.trim();
	const length = characterCount(message);
	if (length > GROUP_POST_MESSAGE_MAX_LENGTH) {
		throw new InvalidPostMessageError();
	}
	return length === 0 ? null : message;
}

/** Text or an attachment (spec 036, RN-06). */
export function assertPostHasContent(
	message: string | null,
	hasAttachment: boolean,
): void {
	if (message === null && !hasAttachment) {
		throw new EmptyPostError();
	}
}

/** What the post's header says was shared (spec 036, RN-17). */
export type GroupPostHeadline =
	| "message"
	| "image"
	| "file"
	| "assignment"
	| "quiz"
	| "quizzes";

/**
 * An assignment that lost its card reads as a file (spec 038, RN-16); a
 * message says what it carries.
 */
export function postHeadlineOf(
	post: Pick<GroupPost, "kind" | "file">,
	attachmentAlive: boolean,
): GroupPostHeadline {
	if (post.kind === "assignment") {
		return attachmentAlive ? "assignment" : "file";
	}
	// A shared quiz that left the group reads as a file too (spec 037, RN-13);
	// "múltiplos kahoots" never changes.
	if (post.kind === "quizShare") {
		return attachmentAlive ? "quiz" : "file";
	}
	if (post.kind === "quizzesShare") {
		return "quizzes";
	}
	if (post.file === null) {
		return "message";
	}
	return post.file.type === "image" ? "image" : "file";
}
