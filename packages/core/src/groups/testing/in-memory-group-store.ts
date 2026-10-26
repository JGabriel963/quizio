import type {
	GroupFeedQuery,
	GroupPostRecord,
} from "../application/ports/group-feed-query";
import type { GroupMemberRepository } from "../application/ports/group-member-repository";
import type { GroupPostRepository } from "../application/ports/group-post-repository";
import type {
	GroupListRecord,
	GroupMemberRecord,
	GroupReads,
} from "../application/ports/group-reads";
import type { GroupRepository } from "../application/ports/group-repository";
import type { GroupVisitRepository } from "../application/ports/group-visit-repository";
import type { Group } from "../domain/group";
import type { GroupMember } from "../domain/group-member";
import type { GroupPermission } from "../domain/group-permissions";
import type { GroupPost } from "../domain/group-post";

interface StoredUser {
	id: string;
	name: string;
	email: string;
}

/** Copies, so a test cannot change what is stored by keeping a reference. */
const copyGroup = (group: Group): Group => ({
	...group,
	permissions: { ...group.permissions },
});

const memberKey = (groupId: string, userId: string) => `${groupId}:${userId}`;

/**
 * Every groups port over the same maps, with the accounts the read model
 * joins: give it the users first (`addUser`). Deleting a group takes its
 * members, visits, posts and likes, as the database's cascade does.
 */
export class InMemoryGroupStore
	implements
		GroupRepository,
		GroupMemberRepository,
		GroupVisitRepository,
		GroupReads,
		GroupPostRepository,
		GroupFeedQuery
{
	readonly #groups = new Map<string, Group>();
	readonly #members = new Map<string, GroupMember>();
	readonly #visits = new Map<
		string,
		{ userId: string; groupId: string; at: Date }
	>();
	readonly #users = new Map<string, StoredUser>();
	readonly #posts = new Map<string, GroupPost>();
	/** `postId:userId` of each like. */
	readonly #likes = new Set<string>();

	addUser(user: StoredUser): void {
		this.#users.set(user.id, { ...user });
	}

	/** The account's name, or the id for an account it was not given. */
	userName(userId: string): string {
		return this.#users.get(userId)?.name ?? userId;
	}

	async findById(id: string): Promise<Group | null> {
		const group = this.#groups.get(id);
		return group ? copyGroup(group) : null;
	}

	async findByInviteCode(code: string): Promise<Group | null> {
		const group = [...this.#groups.values()].find(
			(candidate) => candidate.inviteCode === code,
		);
		return group ? copyGroup(group) : null;
	}

	async create(group: Group, admin: GroupMember): Promise<void> {
		this.#groups.set(group.id, copyGroup(group));
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

	async saveDetails(
		id: string,
		details: { name: string; description: string },
	): Promise<void> {
		const group = this.#groups.get(id);
		if (group) {
			this.#groups.set(id, { ...group, ...details });
		}
	}

	async savePermission(
		id: string,
		permission: GroupPermission,
		value: boolean,
	): Promise<void> {
		const group = this.#groups.get(id);
		if (group) {
			this.#groups.set(id, {
				...group,
				permissions: { ...group.permissions, [permission]: value },
			});
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
		for (const post of [...this.#posts.values()]) {
			if (post.groupId === id) {
				await this.deletePost(post.id);
			}
		}
	}

	async createPost(post: GroupPost): Promise<"created" | "taken"> {
		const taken = [...this.#posts.values()].some(
			(other) =>
				post.gameId !== null &&
				other.groupId === post.groupId &&
				other.gameId === post.gameId,
		);
		if (taken) {
			return "taken";
		}
		this.#posts.set(post.id, { ...post });
		return "created";
	}

	async findPost(groupId: string, postId: string): Promise<GroupPost | null> {
		const post = this.#posts.get(postId);
		return post && post.groupId === groupId ? { ...post } : null;
	}

	async deletePost(postId: string): Promise<void> {
		this.#posts.delete(postId);
		for (const like of [...this.#likes]) {
			if (like.startsWith(`${postId}:`)) {
				this.#likes.delete(like);
			}
		}
	}

	async setLike(
		postId: string,
		userId: string,
		liked: boolean,
		_at?: Date,
	): Promise<void> {
		if (liked && this.#posts.has(postId)) {
			this.#likes.add(`${postId}:${userId}`);
		} else {
			this.#likes.delete(`${postId}:${userId}`);
		}
	}

	async listPosts(
		groupId: string,
		viewerId: string,
	): Promise<GroupPostRecord[]> {
		return [...this.#posts.values()]
			.filter((post) => post.groupId === groupId)
			.sort(
				(a, b) =>
					b.createdAt.getTime() - a.createdAt.getTime() ||
					b.id.localeCompare(a.id),
			)
			.map((post) => ({
				...post,
				authorName: this.#users.get(post.authorId)?.name ?? post.authorId,
				likeCount: this.#likeCountOf(post.id),
				likedByViewer: this.#likes.has(`${post.id}:${viewerId}`),
			}));
	}

	async likeCount(postId: string): Promise<number> {
		return this.#likeCountOf(postId);
	}

	async feedStats(
		groupId: string,
	): Promise<{ posts: number; assignments: number }> {
		const posts = [...this.#posts.values()].filter(
			(post) => post.groupId === groupId,
		);
		return {
			posts: posts.length,
			assignments: posts.filter((post) => post.gameId !== null).length,
		};
	}

	async groupsWithAssignment(
		gameId: string,
		groupIds: readonly string[],
	): Promise<string[]> {
		return groupIds.filter((groupId) =>
			[...this.#posts.values()].some(
				(post) => post.groupId === groupId && post.gameId === gameId,
			),
		);
	}

	#likeCountOf(postId: string): number {
		return [...this.#likes].filter((like) => like.startsWith(`${postId}:`))
			.length;
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
