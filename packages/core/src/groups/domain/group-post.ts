import { characterCount } from "../../shared/domain/text-length";
import { InvalidPostMessageError } from "./group-errors";

/** As "Criar publicação" counts it (spec 038, RN-12). */
export const GROUP_POST_MESSAGE_MAX_LENGTH = 500;

/** What a post is; the text posts of spec 036 will add "text". */
export const GROUP_POST_KINDS = ["assignment"] as const;
export type GroupPostKind = (typeof GROUP_POST_KINDS)[number];

/**
 * An item of the group's feed (spec 038, RN-13; ADR 0016). An assignment's
 * post points at the game by id, which may end or be deleted meanwhile.
 */
export interface GroupPost {
	id: string;
	groupId: string;
	authorId: string;
	kind: GroupPostKind;
	message: string | null;
	gameId: string | null;
	createdAt: Date;
}

/** 1 to 500 characters; the line breaks stay, the ends' spaces go (RN-12). */
export function parsePostMessage(raw: string): string {
	const message = raw.trim();
	const length = characterCount(message);
	if (length === 0 || length > GROUP_POST_MESSAGE_MAX_LENGTH) {
		throw new InvalidPostMessageError();
	}
	return message;
}
