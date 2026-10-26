import type { GroupMemberRepository } from "../application/ports/group-member-repository";
import type {
	GroupListRecord,
	GroupMemberRecord,
	GroupReads,
} from "../application/ports/group-reads";
import type { GroupRepository } from "../application/ports/group-repository";
import type { GroupVisitRepository } from "../application/ports/group-visit-repository";
import type { Group } from "../domain/group";
import type { GroupMember } from "../domain/group-member";

interface StoredUser {
	id: string;
	name: string;
	email: string;
}

const memberKey = (groupId: string, userId: string) => `${groupId}:${userId}`;

/**
 * Every groups port over the same maps, with the accounts the read model
 * joins: give it the users first (`addUser`). Deleting a group takes its
 * members and visits, as the database's cascade does.
 */
export class InMemoryGroupStore
	implements
		GroupRepository,
		GroupMemberRepository,
		GroupVisitRepository,
		GroupReads
{
	readonly #groups = new Map<string, Group>();
	readonly #members = new Map<string, GroupMember>();
	readonly #visits = new Map<
		string,
		{ userId: string; groupId: string; at: Date }
	>();
	readonly #users = new Map<string, StoredUser>();

	addUser(user: StoredUser): void {
		this.#users.set(user.id, { ...user });
	}

	async findById(id: string): Promise<Group | null> {
		const group = this.#groups.get(id);
		return group ? { ...group } : null;
	}

	async findByInviteCode(code: string): Promise<Group | null> {
		const group = [...this.#groups.values()].find(
			(candidate) => candidate.inviteCode === code,
		);
		return group ? { ...group } : null;
	}

	async create(group: Group, admin: GroupMember): Promise<void> {
		this.#groups.set(group.id, { ...group });
		this.#members.set(memberKey(admin.groupId, admin.userId), { ...admin });
	}

	async saveInviteCode(id: string, code: string): Promise<void> {
		const group = this.#groups.get(id);
		if (group) {
			this.#groups.set(id, { ...group, inviteCode: code });
		}
	}

	async saveSetupDismissed(id: string, at: Date): Promise<void> {
		const group = this.#groups.get(id);
		if (group) {
			this.#groups.set(id, { ...group, setupDismissedAt: at });
		}
	}

	async delete(id: string): Promise<void> {
		this.#groups.delete(id);
		for (const [key, member] of this.#members) {
			if (member.groupId === id) {
				this.#members.delete(key);
			}
		}
		for (const [key, visit] of this.#visits) {
			if (visit.groupId === id) {
				this.#visits.delete(key);
			}
		}
	}

	async find(groupId: string, userId: string): Promise<GroupMember | null> {
		const member = this.#members.get(memberKey(groupId, userId));
		return member ? { ...member } : null;
	}

	async addWithInvite(input: {
		groupId: string;
		inviteCode: string;
		userId: string;
		joinedAt: Date;
	}): Promise<"added" | "alreadyMember" | "invalid"> {
		if (this.#members.has(memberKey(input.groupId, input.userId))) {
			return "alreadyMember";
		}
		if (this.#groups.get(input.groupId)?.inviteCode !== input.inviteCode) {
			return "invalid";
		}
		this.#members.set(memberKey(input.groupId, input.userId), {
			groupId: input.groupId,
			userId: input.userId,
			role: "member",
			joinedAt: input.joinedAt,
		});
		return "added";
	}

	async remove(groupId: string, userId: string): Promise<void> {
		this.#members.delete(memberKey(groupId, userId));
	}

	async touch(userId: string, groupId: string, at: Date): Promise<void> {
		this.#visits.set(memberKey(groupId, userId), { userId, groupId, at });
	}

	async listForUser(userId: string): Promise<GroupListRecord[]> {
		return [...this.#members.values()]
			.filter((member) => member.userId === userId)
			.flatMap((member) => {
				const group = this.#groups.get(member.groupId);
				if (!group) {
					return [];
				}
				return [
					{
						id: group.id,
						name: group.name,
						role: member.role,
						memberCount: this.#countMembers(group.id),
						since: member.role === "admin" ? group.createdAt : member.joinedAt,
					},
				];
			});
	}

	async recentForUser(
		userId: string,
		limit: number,
	): Promise<{ id: string; name: string }[]> {
		return [...this.#visits.values()]
			.filter(
				(visit) =>
					visit.userId === userId &&
					this.#members.has(memberKey(visit.groupId, userId)),
			)
			.sort((a, b) => b.at.getTime() - a.at.getTime())
			.slice(0, limit)
			.flatMap((visit) => {
				const group = this.#groups.get(visit.groupId);
				return group ? [{ id: group.id, name: group.name }] : [];
			});
	}

	async members(groupId: string): Promise<GroupMemberRecord[]> {
		return [...this.#members.values()]
			.filter((member) => member.groupId === groupId)
			.map((member) => {
				const user = this.#users.get(member.userId);
				return {
					userId: member.userId,
					name: user?.name ?? member.userId,
					email: user?.email ?? `${member.userId}@exemplo.com`,
					role: member.role,
					joinedAt: member.joinedAt,
				};
			});
	}

	#countMembers(groupId: string): number {
		return [...this.#members.values()].filter(
			(member) => member.groupId === groupId,
		).length;
	}
}
