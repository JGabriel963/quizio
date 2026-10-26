import type { Group } from "../../domain/group";
import type { GroupMember } from "../../domain/group-member";

/** The group's own row (spec 034; ADR 0015). */
export interface GroupRepository {
	findById(id: string): Promise<Group | null>;
	findByInviteCode(code: string): Promise<Group | null>;
	/** The group and its admin's membership, together (RN-01). */
	create(group: Group, admin: GroupMember): Promise<void>;
	/** Only the code: an invite reset never rewrites the name (RN-24). */
	saveInviteCode(id: string, code: string): Promise<void>;
	saveSetupDismissed(id: string, at: Date): Promise<void>;
	/** Its members and visits go with it (RN-37). */
	delete(id: string): Promise<void>;
}
