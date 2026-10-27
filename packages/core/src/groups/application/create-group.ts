import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { type Group, parseGroupName } from "../domain/group";
import { DEFAULT_GROUP_PERMISSIONS } from "../domain/group-permissions";
import type { GroupRepository } from "./ports/group-repository";
import type { InviteCodeGenerator } from "./ports/invite-code-generator";

export type CreateGroup = (input: {
	userId: string;
	name: string;
}) => Promise<{ groupId: string }>;

/** Its creator is the admin and its first member (spec 034, RN-01, RN-02). */
export function createCreateGroup(deps: {
	groups: GroupRepository;
	ids: IdGenerator;
	inviteCodes: InviteCodeGenerator;
	clock: Clock;
}): CreateGroup {
	return async ({ userId, name: raw }) => {
		const name = parseGroupName(raw);
		const now = deps.clock.now();
		const group: Group = {
			id: deps.ids.generate(),
			name,
			description: "",
			permissions: { ...DEFAULT_GROUP_PERMISSIONS },
			adminId: userId,
			inviteCode: deps.inviteCodes.generate(),
			createdAt: now,
			setupDismissedAt: null,
		};
		await deps.groups.create(group, {
			groupId: group.id,
			userId,
			role: "admin",
			joinedAt: now,
		});
		return { groupId: group.id };
	};
}
