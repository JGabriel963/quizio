import type { NotificationQuery } from "@quizio/core/notifications/application/ports/notification-query";
import type {
	NotificationCursor,
	NotificationRecord,
} from "@quizio/core/notifications/domain/notification";
import {
	and,
	desc,
	eq,
	gt,
	gte,
	isNull,
	lt,
	max,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { alias } from "drizzle-orm/pg-core";

import { user } from "../../schema/auth";
import { groupMember, groupPost, groupTable } from "../../schema/groups";
import { groupNotice, notificationRead } from "../../schema/notifications";
import type { Database } from "../../types";

interface ListOptions {
	limit: number;
	readAllAt: Date | null;
	keepReadSince: Date;
	before?: NotificationCursor;
	unreadOnly?: boolean;
}

/**
 * Unread, or recent enough to keep (spec 040, RN-21): a read one older than
 * the cutoff is left out before the limit, so a page is always full.
 */
function kept(
	at: AnyPgColumn,
	readAt: AnyPgColumn,
	options: ListOptions,
): SQL | undefined {
	const unread = options.readAllAt
		? and(isNull(readAt), gt(at, options.readAllAt))
		: isNull(readAt);
	return options.unreadOnly
		? unread
		: or(unread, gte(at, options.keepReadSince));
}

/**
 * Ids compared byte by byte, as JavaScript compares the merged pages; a
 * locale collation could order a tie differently and skip or repeat one.
 */
const byteOrder = (id: SQL<string>) => sql<string>`(${id}) collate "C"`;

/** After the cursor in the order (at, id), newest first (RN-13). */
function afterCursor(
	at: AnyPgColumn,
	id: SQL<string>,
	before: NotificationCursor | undefined,
): SQL | undefined {
	return before
		? or(
				lt(at, before.at),
				and(eq(at, before.at), lt(byteOrder(id), before.id)),
			)
		: undefined;
}

/**
 * A user's notifications as a reading of the groups (spec 040; ADR 0020):
 * the others' posts in their groups since they joined, the members joining
 * the groups they administer, and the stored notices. Each part is filtered,
 * ordered and limited, then the three are merged. The builders leave the
 * `where` to `list`, which sets the whole condition at once.
 */
export function createDrizzleNotificationQuery(
	db: Database,
): NotificationQuery {
	const me = alias(groupMember, "me");
	const joiner = alias(groupMember, "joiner");
	const actor = alias(user, "actor");

	const postId = sql<string>`'post:' || ${groupPost.id}`;
	// Joining again is another notification, so the time is part of the id.
	const joinId = sql<string>`'join:' || ${joiner.groupId} || ':' || ${joiner.userId} || ':' || floor(extract(epoch from ${joiner.joinedAt}) * 1000)::bigint`;
	const noticeId = sql<string>`'notice:' || ${groupNotice.id}`;

	/** Posts by others in the user's groups, after they joined (RN-02 to RN-04, RN-08). */
	function postsOf(userId: string) {
		return db
			.select({
				id: postId,
				at: groupPost.createdAt,
				postId: groupPost.id,
				postKind: groupPost.kind,
				actorId: actor.id,
				actorName: actor.name,
				groupId: groupTable.id,
				groupName: groupTable.name,
				readAt: notificationRead.readAt,
			})
			.from(groupPost)
			.innerJoin(
				me,
				and(
					eq(me.groupId, groupPost.groupId),
					eq(me.userId, userId),
					gte(groupPost.createdAt, me.joinedAt),
				),
			)
			.innerJoin(groupTable, eq(groupTable.id, groupPost.groupId))
			.innerJoin(actor, eq(actor.id, groupPost.authorId))
			.leftJoin(
				notificationRead,
				and(
					eq(notificationRead.userId, userId),
					eq(notificationRead.notificationId, postId),
				),
			)
			.$dynamic();
	}

	/** Members joining the groups the user administers (RN-05). */
	function joinsOf(userId: string) {
		return db
			.select({
				id: joinId,
				at: joiner.joinedAt,
				actorId: actor.id,
				actorName: actor.name,
				groupId: groupTable.id,
				groupName: groupTable.name,
				readAt: notificationRead.readAt,
			})
			.from(joiner)
			.innerJoin(
				me,
				and(
					eq(me.groupId, joiner.groupId),
					eq(me.userId, userId),
					eq(me.role, "admin"),
				),
			)
			.innerJoin(groupTable, eq(groupTable.id, joiner.groupId))
			.innerJoin(actor, eq(actor.id, joiner.userId))
			.leftJoin(
				notificationRead,
				and(
					eq(notificationRead.userId, userId),
					eq(notificationRead.notificationId, joinId),
				),
			)
			.$dynamic();
	}

	/** Removed, or the group deleted (RN-06). */
	function noticesOf(userId: string) {
		return db
			.select({
				id: noticeId,
				at: groupNotice.createdAt,
				kind: groupNotice.kind,
				groupName: groupNotice.groupName,
				readAt: notificationRead.readAt,
			})
			.from(groupNotice)
			.leftJoin(
				notificationRead,
				and(
					eq(notificationRead.userId, userId),
					eq(notificationRead.notificationId, noticeId),
				),
			)
			.$dynamic();
	}

	return {
		async list(userId, options) {
			const [posts, joins, notices] = await Promise.all([
				postsOf(userId)
					.where(
						and(
							ne(groupPost.authorId, userId),
							kept(groupPost.createdAt, notificationRead.readAt, options),
							afterCursor(groupPost.createdAt, postId, options.before),
						),
					)
					.orderBy(desc(groupPost.createdAt), desc(byteOrder(postId)))
					.limit(options.limit),
				joinsOf(userId)
					.where(
						and(
							eq(joiner.role, "member"),
							ne(joiner.userId, userId),
							kept(joiner.joinedAt, notificationRead.readAt, options),
							afterCursor(joiner.joinedAt, joinId, options.before),
						),
					)
					.orderBy(desc(joiner.joinedAt), desc(byteOrder(joinId)))
					.limit(options.limit),
				noticesOf(userId)
					.where(
						and(
							eq(groupNotice.userId, userId),
							kept(groupNotice.createdAt, notificationRead.readAt, options),
							afterCursor(groupNotice.createdAt, noticeId, options.before),
						),
					)
					.orderBy(desc(groupNotice.createdAt), desc(byteOrder(noticeId)))
					.limit(options.limit),
			]);
			const records: NotificationRecord[] = [
				...posts.map((row) => ({
					id: row.id,
					at: row.at,
					source: {
						kind: "post" as const,
						postId: row.postId,
						postKind: row.postKind,
					},
					actor: { userId: row.actorId, name: row.actorName },
					group: { id: row.groupId, name: row.groupName },
					readAt: row.readAt,
				})),
				...joins.map((row) => ({
					id: row.id,
					at: row.at,
					source: { kind: "joined" as const },
					actor: { userId: row.actorId, name: row.actorName },
					group: { id: row.groupId, name: row.groupName },
					readAt: row.readAt,
				})),
				...notices.map((row) => ({
					id: row.id,
					at: row.at,
					source: { kind: row.kind },
					actor: null,
					group: { id: null, name: row.groupName },
					readAt: row.readAt,
				})),
			];
			return records
				.sort(
					(a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : -1),
				)
				.slice(0, options.limit);
		},

		async latestAt(userId) {
			const [[posts], [joins], [notices]] = await Promise.all([
				db
					.select({ at: max(groupPost.createdAt) })
					.from(groupPost)
					.innerJoin(
						me,
						and(
							eq(me.groupId, groupPost.groupId),
							eq(me.userId, userId),
							gte(groupPost.createdAt, me.joinedAt),
						),
					)
					.where(ne(groupPost.authorId, userId)),
				db
					.select({ at: max(joiner.joinedAt) })
					.from(joiner)
					.innerJoin(
						me,
						and(
							eq(me.groupId, joiner.groupId),
							eq(me.userId, userId),
							eq(me.role, "admin"),
						),
					)
					.where(and(eq(joiner.role, "member"), ne(joiner.userId, userId))),
				db
					.select({ at: max(groupNotice.createdAt) })
					.from(groupNotice)
					.where(eq(groupNotice.userId, userId)),
			]);
			const times = [posts?.at, joins?.at, notices?.at]
				.filter((at): at is Date => at instanceof Date)
				.map((at) => at.getTime());
			return times.length > 0 ? new Date(Math.max(...times)) : null;
		},
	};
}
