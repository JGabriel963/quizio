import { DomainError } from "../../shared/domain/domain-error";
import { normalizeSearchText } from "../../shared/domain/search-text";
import { characterCount } from "../../shared/domain/text-length";

/** Spaces included (spec 008, RN-41). */
export const NICKNAME_MAX_LENGTH = 15;

export class InvalidNicknameError extends DomainError {
	readonly code = "GAME.INVALID_NICKNAME";
}

/** Trims, joins repeated spaces and enforces 1 to 15 perceived characters. */
export function parseNickname(raw: string): string {
	const nickname = raw.replace(/\s+/g, " ").trim();
	const length = characterCount(nickname);
	if (length === 0 || length > NICKNAME_MAX_LENGTH) {
		throw new InvalidNicknameError(
			`A nickname has 1 to ${NICKNAME_MAX_LENGTH} characters`,
		);
	}
	return nickname;
}

/**
 * What makes two nicknames the same in a game: "José" and "jose" share a key
 * (RN-42).
 */
export function nicknameKeyOf(nickname: string): string {
	return normalizeSearchText(nickname);
}
