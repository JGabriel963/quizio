import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	attachmentOf,
	type GroupAssignmentRecord,
} from "../domain/group-assignment";
import type { GroupFileType } from "../domain/group-file";
import type { GroupMember } from "../domain/group-member";
import { canManagePost } from "../domain/group-permissions";
import {
	type GroupPostHeadline,
	type GroupPostKind,
	postHeadlineOf,
} from "../domain/group-post";
import type { GroupAssignmentQuery } from "./ports/group-assignments";
import type { GroupPostRecord } from "./ports/group-feed-query";
import type { SharedQuizReads } from "./ports/shared-quiz-reads";
import {
	type SharedQuizCardView,
	sharedQuizCardViewOf,
} from "./shared-quiz-view";

/** The card of an assignment as the screens draw it (spec 038, RN-14, RN-23). */
export interface GroupAssignmentCard {
	gameId: string;
	name: string;
	questionCount: number;
	coverUrl: string | null;
	ownerName: string;
	remainingMs: number;
}

/** An image or a PDF as the feed shows it (spec 036, RN-10, RN-11). */
export interface GroupPostFileView {
	type: GroupFileType;
	url: string;
	name: string;
	sizeBytes: number;
}

/** A post of the feed (spec 036; spec 038, RN-13 to RN-20). */
export interface GroupPostView {
	id: string;
	/** What was posted, whatever is left of it (spec 037: a removed quiz). */
	kind: GroupPostKind;
	/** What the header says was shared (spec 036, RN-17). */
	headline: GroupPostHeadline;
	author: { userId: string; name: string };
	createdAt: Date;
	message: string | null;
	/** The assignment, also once its card is gone ("Ver relatório"). */
	gameId: string | null;
	likeCount: number;
	liked: boolean;
	/** Null once the assignment is over or gone (RN-16). */
	attachment: GroupAssignmentCard | null;
	/** The image or PDF of a message (spec 036). */
	file: GroupPostFileView | null;
	/**
	 * The quiz of "compartilhou um kahoot", while it is in the group and out
	 * of its owner's trash (spec 037, RN-09, RN-13).
	 */
	quiz: SharedQuizCardView | null;
	/** "Ver relatório": who posted and the admin, while the report exists (RN-20). */
	canSeeReport: boolean;
	/** "Excluir publicação": who posted and the admin (RN-20, RN-31). */
	canDelete: boolean;
}

export interface GroupPostViewDeps {
	groupAssignmentQuery: GroupAssignmentQuery;
	sharedQuizReads: SharedQuizReads;
	storage: ObjectStorage;
	clock: Clock;
}

/**
 * The posts with their assignments, read from the game in one go: a post
 * whose assignment ended, ran out or was deleted keeps its message and likes
 * and loses the card (RN-16).
 */
export async function postViewsOf(
	deps: GroupPostViewDeps,
	posts: readonly GroupPostRecord[],
	viewer: GroupMember,
): Promise<GroupPostView[]> {
	const gameIds = posts.flatMap((post) => (post.gameId ? [post.gameId] : []));
	const records = new Map<string, GroupAssignmentRecord>(
		(await deps.groupAssignmentQuery.findAssignments(gameIds)).map((record) => [
			record.gameId,
			record,
		]),
	);
	const sharedQuizIds = posts.flatMap((post) =>
		post.sharedQuizId ? [post.sharedQuizId] : [],
	);
	const quizzes = new Map(
		(await deps.sharedQuizReads.sharedQuizCards(sharedQuizIds)).map((card) => [
			card.sharedQuizId,
			card,
		]),
	);
	const now = deps.clock.now();
	return posts.map((post) => {
		const record = post.gameId ? (records.get(post.gameId) ?? null) : null;
		const attachment = attachmentOf(record, now);
		const quizCard = post.sharedQuizId
			? (quizzes.get(post.sharedQuizId) ?? null)
			: null;
		const manages = canManagePost(post, viewer);
		return {
			id: post.id,
			kind: post.kind,
			headline: postHeadlineOf(
				post,
				post.kind === "quizShare" ? quizCard !== null : attachment !== null,
			),
			author: { userId: post.authorId, name: post.authorName },
			createdAt: post.createdAt,
			message: post.message,
			gameId: post.gameId,
			likeCount: post.likeCount,
			liked: post.likedByViewer,
			attachment: attachment && {
				gameId: attachment.gameId,
				name: attachment.name,
				questionCount: attachment.questionCount,
				coverUrl: attachment.coverImageKey
					? deps.storage.getPublicUrl(attachment.coverImageKey)
					: null,
				ownerName: attachment.ownerName,
				remainingMs: attachment.remainingMs,
			},
			file: post.file && {
				type: post.file.type,
				url: deps.storage.getPublicUrl(post.file.key),
				name: post.file.name,
				sizeBytes: post.file.sizeBytes,
			},
			quiz: quizCard && sharedQuizCardViewOf(quizCard, deps.storage, viewer),
			canSeeReport: manages && record !== null,
			canDelete: manages,
		};
	});
}
