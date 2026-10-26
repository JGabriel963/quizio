import type { GroupMember } from "../../domain/group-member";

/** Who belongs to which group (spec 034; ADR 0015). */
export interface GroupMemberRepository {
	find(groupId: string, userId: string): Promise<GroupMember | null>;
	/**
	 * Adds a member only while the group's invite is still `inviteCode`, so a
	 * reset at the same time never lets the old link in (RN-29); a membership
	 * that exists stays as it is (CA-20).
	 */
	addWithInvite(input: {
		groupId: string;
		inviteCode: string;
		userId: string;
		joinedAt: Date;
	}): Promise<"added" | "alreadyMember" | "invalid">;
	remove(groupId: string, userId: string): Promise<void>;
}
