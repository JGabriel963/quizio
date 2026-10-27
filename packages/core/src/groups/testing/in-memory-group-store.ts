import type {
	GroupFeedCursor,
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
import type { GroupSharedQuizRepository } from "../application/ports/group-shared-quiz-repository";
import type {
	GroupUpload,
	GroupUploadRepository,
} from "../application/ports/group-upload-repository";
import type { GroupVisitRepository } from "../application/ports/group-visit-repository";
import type { Group } from "../domain/group";
import type { GroupMember } from "../domain/group-member";
import type { GroupPermission } from "../domain/group-permissions";
import type { GroupPost } from "../domain/group-post";
import type { SharedQuiz } from "../domain/shared-quiz";

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

type Ordered = { createdAt: Date; id: string };
/** The feed's order: newest first, then by id (spec 036, RN-18). */
const newestFirst = (a: Ordered, b: Ordered) =>
	b.createdAt.getTime() - a.createdAt.getTime() ||
	(b.id < a.id ? -1 : b.id > a.id ? 1 : 0);

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
		GroupFeedQuery,
		GroupUploadRepository,
		GroupSharedQuizRepository
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
	readonly #uploads = new Map<string, GroupUpload>();
	readonly #shares = new Map<string, SharedQuiz>();

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
		for (const [key, upload] of this.#uploads) {
			if (upload.groupId === id) {
				this.#uploads.delete(key);
			}
		}
		for (const [key, share] of this.#shares) {
			if (share.groupId === id) {
				this.#shares.delete(key);
			}
		}
	}

	async shareWithPost(
		shares: readonly SharedQuiz[],
		post: GroupPost,
	): Promise<"created" | "alreadyShared"> {
		const taken = shares.some((share) =>
			[...this.#shares.values()].some(
				(other) =>
					other.groupId === share.groupId && other.quizId === share.quizId,
			),
		);
		if (taken) {
			return "alreadyShared";
		}
		for (const share of shares) {
			this.#shares.set(share.id, { ...share });
		}
		this.#posts.set(post.id, { ...post });
		return "created";
	}

	async findSharedQuiz(
		groupId: string,
		quizId: string,
	): Promise<SharedQuiz | null> {
		const share = [...this.#shares.values()].find(
			(candidate) =>
				candidate.groupId === groupId && candidate.quizId === quizId,
		);
		return share ? { ...share } : null;
	}

	async removeSharedQuiz(id: string): Promise<void> {
		this.#shares.delete(id);
	}

	async sharedQuizIdsOf(groupId: string): Promise<string[]> {
		return [...this.#shares.values()]
			.filter((share) => share.groupId === groupId)
			.map((share) => share.quizId);
	}

	/** Test helper: the shares of a group, as the read model joins them. */
	sharesOf(groupId: string): SharedQuiz[] {
		return [...this.#shares.values()]
			.filter((share) => share.groupId === groupId)
			.map((share) => ({ ...share }));
	}

	/** Test helper: a share by its id. */
	shareById(id: string): SharedQuiz | null {
		const share = this.#shares.get(id);
		return share ? { ...share } : null;
	}

	/** As the database's cascade when the owner deletes the quiz for good. */
	deleteSharesOfQuiz(quizId: string): void {
		for (const [key, share] of this.#shares) {
			if (share.quizId === quizId) {
				this.#shares.delete(key);
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

	async createMessageFromUpload(
		post: Omit<GroupPost, "file">,
		upload: { key: string; uploaderId: string },
	): Promise<"created" | "missing"> {
		const pending = this.#uploads.get(upload.key);
		if (
			!pending ||
			pending.uploaderId !== upload.uploaderId ||
			pending.groupId !== post.groupId
		) {
			return "missing";
		}
		this.#uploads.delete(upload.key);
		this.#posts.set(post.id, {
			...post,
			file: { ...pending.file, key: pending.key },
		});
		return "created";
	}

	async findPost(groupId: string, postId: string): Promise<GroupPost | null> {
		const post = this.#posts.get(postId);
		return post && post.groupId === groupId ? { ...post } : null;
	}

	async deletePost(postId: string): Promise<GroupPost | null> {
		const post = this.#posts.get(postId) ?? null;
		this.#posts.delete(postId);
		for (const like of [...this.#likes]) {
			if (like.startsWith(`${postId}:`)) {
				this.#likes.delete(like);
			}
		}
		return post;
	}

	async fileKeysOfGroup(groupId: string): Promise<string[]> {
		return [...this.#posts.values()].flatMap((post) =>
			post.groupId === groupId && post.file ? [post.file.key] : [],
		);
	}

	async fileKeysByAuthor(authorId: string): Promise<string[]> {
		return [...this.#posts.values()].flatMap((post) =>
			post.authorId === authorId && post.file ? [post.file.key] : [],
		);
	}

	async addUpload(upload: GroupUpload): Promise<void> {
		this.#uploads.set(upload.key, { ...upload, file: { ...upload.file } });
	}

	async removeUpload(key: string, uploaderId: string): Promise<boolean> {
		if (this.#uploads.get(key)?.uploaderId !== uploaderId) {
			return false;
		}
		return this.#uploads.delete(key);
	}

	async takeExpiredUploads(before: Date, limit: number): Promise<string[]> {
		const expired = [...this.#uploads.values()]
			.filter((upload) => upload.createdAt < before)
			.slice(0, limit)
			.map((upload) => upload.key);
		for (const key of expired) {
			this.#uploads.delete(key);
		}
		return expired;
	}

	async uploadKeysOfGroup(groupId: string): Promise<string[]> {
		return [...this.#uploads.values()]
			.filter((upload) => upload.groupId === groupId)
			.map((upload) => upload.key);
	}

	async uploadKeysOfUser(userId: string): Promise<string[]> {
		return [...this.#uploads.values()]
			.filter((upload) => upload.uploaderId === userId)
			.map((upload) => upload.key);
	}

	/** Test helper: the pending upload, if any. */
	async findUpload(key: string): Promise<GroupUpload | null> {
		const upload = this.#uploads.get(key);
		return upload ? { ...upload, file: { ...upload.file } } : null;
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
		page?: { limit: number; after: GroupFeedCursor | null },
	): Promise<GroupPostRecord[]> {
		const after = page?.after ?? null;
		const posts = [...this.#posts.values()]
			.filter(
				(post) =>
					post.groupId === groupId &&
					(after === null || newestFirst(after, post) < 0),
			)
			.sort(newestFirst);
		return (page ? posts.slice(0, page.limit) : posts).map((post) => ({
			...post,
			authorName: this.#users.get(post.authorId)?.name ?? post.authorId,
			likeCount: this.#likeCountOf(post.id),
			likedByViewer: this.#likes.has(`${post.id}:${viewerId}`),
		}));
	}

	async findPostRecord(
		groupId: string,
		postId: string,
		viewerId: string,
	): Promise<GroupPostRecord | null> {
		const posts = await this.listPosts(groupId, viewerId);
		return posts.find((post) => post.id === postId) ?? null;
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
		// Their quizzes leave with them, as the database's cascade does
		// (spec 037, RN-22).
		for (const [key, share] of this.#shares) {
			if (share.groupId === groupId && share.sharedById === userId) {
				this.#shares.delete(key);
			}
		}
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
