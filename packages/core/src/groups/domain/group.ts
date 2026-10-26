import { characterCount } from "../../shared/domain/text-length";
import { InvalidGroupNameError } from "./group-errors";

export { InvalidGroupNameError } from "./group-errors";

/** The group's name, as in Kahoot's "Criar grupo" (spec 034, RN-03). */
export const GROUP_NAME_MAX_LENGTH = 20;

/**
 * A group: its admin and members meet in it (spec 034, RN-01; ADR 0015). The
 * memberships are rows of their own, the admin's included.
 */
export interface Group {
	id: string;
	name: string;
	/** The creator, the group's only admin (RN-02). */
	adminId: string;
	/** The secret of the one valid invite link (RN-23). */
	inviteCode: string;
	createdAt: Date;
	/** "Pular configuração" (RN-17). */
	setupDismissedAt: Date | null;
}

/** 1 to 20 characters without the spaces at the ends (RN-03). */
export function parseGroupName(raw: string): string {
	const name = raw.trim();
	const length = characterCount(name);
	if (length === 0 || length > GROUP_NAME_MAX_LENGTH) {
		throw new InvalidGroupNameError();
	}
	return name;
}
