import { loadPhotoUrls } from "../../shared/application/person-view";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ProfilePhotoKeys } from "../../shared/application/ports/profile-photo-keys";
import {
	canSeeMemberEmail,
	type GroupRole,
	matchesGroupSearch,
	sortMembers,
} from "../domain/group-member";
import { assertCanSeeMembers } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupReads } from "./ports/group-reads";

/** A row of "Membros do grupo" (spec 034, RN-32, RN-34). */
export interface GroupMemberView {
	userId: string;
	name: string;
	/** Only for the admin; never leaves the server otherwise. */
	email: string | null;
	role: GroupRole;
	/** Spec 039, RN-06. */
	photoUrl: string | null;
}

export type ListGroupMembers = (input: {
	userId: string;
	groupId: string;
	search?: string;
}) => Promise<{ total: number; items: GroupMemberView[] }>;

/** Every member, admin first; the total counts all of them (RN-31). */
export function createListGroupMembers(
	deps: GroupStoreDeps & {
		groupReads: GroupReads;
		profilePhotos: ProfilePhotoKeys;
		storage: ObjectStorage;
	},
): ListGroupMembers {
	return async ({ search = "", ...input }) => {
		const { group, membership } = await requireMembership(deps, input);
		assertCanSeeMembers(group, membership);
		const showEmail = canSeeMemberEmail(membership.role);
		const members = await deps.groupReads.members(input.groupId);
		const photoUrlOf = await loadPhotoUrls(
			members.map((member) => member.userId),
			deps,
		);
		const items = sortMembers(members)
			.filter((member) => matchesGroupSearch(member.name, search))
			.map(({ userId, name, email, role }) => ({
				userId,
				name,
				email: showEmail ? email : null,
				role,
				photoUrl: photoUrlOf(userId),
			}));
		return { total: members.length, items };
	};
}
