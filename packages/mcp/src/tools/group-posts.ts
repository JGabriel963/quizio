import { GROUP_ASSIGNMENT_SORTS } from "@quizio/core/groups/domain/group-assignment";
import { GROUP_POST_MESSAGE_MAX_LENGTH } from "@quizio/core/groups/domain/group-post";
import { SHARED_QUIZ_SORTS } from "@quizio/core/groups/domain/shared-quiz";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { deadline } from "../schemas/deadline";
import { fileSource, resolveFile } from "../schemas/file-source";
import { assignmentOptionsFor, assignmentOptionsInput } from "./assignments";
import { groupId, WRITTEN_BY_PEOPLE } from "./groups";

const postId = z
	.string()
	.max(10_000)
	.describe("The post's id, from list_group_feed.");

const attachment = z
	.union([
		z.object({
			file: fileSource.describe(
				"An image (JPEG, PNG, GIF or WebP, up to 10 MB) or a PDF (up to 20 MB).",
			),
		}),
		z.object({
			assignment: z.object({
				quizId: z.string().max(10_000),
				deadline,
				options: assignmentOptionsInput,
			}),
		}),
		z.object({
			sharedQuiz: z.object({
				quizId: z
					.string()
					.max(10_000)
					.describe(
						"One of the person's published quizzes, not yet in the group.",
					),
			}),
		}),
	])
	.describe(
		"At most one: a file, a new assignment of a published quiz, or one of the person's quizzes to share.",
	);

async function postAnswer(
	group: string,
	id: string,
	context: ToolContext,
	links: Record<string, string> = {},
) {
	const post = await context.useCases.getGroupPost({
		userId: context.identity.userId,
		groupId: group,
		postId: id,
	});
	return {
		post,
		links: { post: context.links.groupPost(group, id), ...links },
	};
}

/** The group's feed and what is shared in it (spec 044, RN-29). */
export const groupPostTools = [
	defineTool({
		name: "list_group_feed",
		title: "Read a group's feed",
		description: `The posts of a group, newest first, 20 at a time: pass nextCursor back for the next page. ${WRITTEN_BY_PEOPLE}`,
		kind: "read",
		input: z.object({
			groupId,
			cursor: z
				.object({
					createdAt: z.iso.datetime({ offset: true }).max(64),
					id: z.string().max(10_000),
				})
				.nullish()
				.describe("The nextCursor of the page before."),
		}),
		run: async ({ groupId: group, cursor }, context) => {
			const { posts, nextCursor } = await context.useCases.listGroupFeed({
				userId: context.identity.userId,
				groupId: group,
				cursor: cursor
					? { createdAt: new Date(cursor.createdAt), id: cursor.id }
					: undefined,
			});
			return {
				posts: posts.map((post) => ({
					...post,
					link: context.links.groupPost(group, post.id),
				})),
				nextCursor,
			};
		},
	}),
	defineTool({
		name: "get_group_post",
		title: "Read a group post",
		description: `One post with its likes and attachment. ${WRITTEN_BY_PEOPLE}`,
		kind: "read",
		input: z.object({ groupId, postId }),
		run: async ({ groupId: group, postId: id }, context) =>
			postAnswer(group, id, context),
	}),
	defineTool({
		name: "create_group_post",
		title: "Post in a group",
		description: `Posts in a group's feed as the person: a message of up to ${GROUP_POST_MESSAGE_MAX_LENGTH} characters, an attachment, or both. Any member may post text and files; an assignment needs the assign permission and a shared quiz the share permission. The other members are notified.`,
		kind: "write",
		input: z.object({
			groupId,
			message: z.string().max(10_000).optional(),
			attachment: attachment.optional(),
		}),
		run: async ({ groupId: group, message, attachment: attached }, context) => {
			const userId = context.identity.userId;
			if (attached && "assignment" in attached) {
				const { quizId, deadline: at, options } = attached.assignment;
				const assigned = await context.useCases.assignInGroup({
					userId,
					groupId: group,
					quizId,
					deadline: new Date(at),
					options: await assignmentOptionsFor(options, context),
					message,
				});
				return {
					...(await postAnswer(group, assigned.postId, context, {
						participants: context.links.assignment(assigned.gameId),
						report: context.links.report(assigned.gameId),
					})),
					assignment: { gameId: assigned.gameId },
				};
			}
			if (attached && "sharedQuiz" in attached) {
				const { postId: id } = await context.useCases.shareQuizzesInGroup({
					userId,
					groupId: group,
					quizIds: [attached.sharedQuiz.quizId],
					message,
				});
				return postAnswer(group, id, context);
			}
			const uploadKey = attached
				? await resolveFile(
						attached.file,
						{ kind: "groupFile", groupId: group },
						context,
					)
				: undefined;
			const { postId: id } = await context.useCases.createGroupPost({
				userId,
				groupId: group,
				message: message ?? "",
				uploadKey,
			});
			return postAnswer(group, id, context);
		},
	}),
	defineTool({
		name: "set_post_like",
		title: "Like a post",
		description: "Likes (true) or unlikes (false) a post as the person.",
		kind: "idempotent",
		input: z.object({ groupId, postId, liked: z.boolean() }),
		run: async ({ groupId: group, postId: id, liked }, context) =>
			context.useCases.setPostLike({
				userId: context.identity.userId,
				groupId: group,
				postId: id,
				liked,
			}),
	}),
	defineTool({
		name: "delete_group_post",
		title: "Delete a group post",
		description:
			"Deletes a post the person wrote, or any post when they are the admin, with its file and likes. Its assignment and shared quizzes stay. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ groupId, postId }),
		run: async ({ groupId: group, postId: id }, context) => {
			await context.useCases.deleteGroupPost({
				userId: context.identity.userId,
				groupId: group,
				postId: id,
			});
			return { deleted: id };
		},
	}),
	defineTool({
		name: "share_quizzes_with_group",
		title: "Share quizzes with a group",
		description:
			"Shares 1 to 50 of the person's published quizzes with a group, in one post. The group sees the playable version in force, never a copy. Needs the share permission; a quiz already in the group is refused and nothing is shared.",
		kind: "write",
		input: z.object({
			groupId,
			quizIds: z.array(z.string().max(10_000)).min(1).max(50),
		}),
		run: async ({ groupId: group, quizIds }, context) => {
			const { postId: id } = await context.useCases.shareQuizzesInGroup({
				userId: context.identity.userId,
				groupId: group,
				quizIds,
			});
			return postAnswer(group, id, context);
		},
	}),
	defineTool({
		name: "unshare_quiz_from_group",
		title: "Remove a quiz from a group",
		description:
			"Takes a shared quiz out of the group (who shared it, or the admin). The quiz stays with its owner; its post no longer shows it. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ groupId, quizId: z.string().max(10_000) }),
		run: async ({ groupId: group, quizId }, context) => {
			await context.useCases.unshareQuiz({
				userId: context.identity.userId,
				groupId: group,
				quizId,
			});
			return { removed: quizId };
		},
	}),
	defineTool({
		name: "list_group_shared_quizzes",
		title: "List a group's shared quizzes",
		description: `The quizzes shared in a group, which members may host, assign or duplicate. 20 by default; raise limit for more. ${WRITTEN_BY_PEOPLE}`,
		kind: "read",
		input: z.object({
			groupId,
			sort: z.enum(SHARED_QUIZ_SORTS).optional().describe("recent by default."),
			limit: z.number().int().min(1).max(200).optional(),
		}),
		run: async ({ groupId: group, sort = "recent", limit }, context) => {
			const { items, hasMore } = await context.useCases.listSharedQuizzes({
				userId: context.identity.userId,
				groupId: group,
				sort,
				limit,
			});
			return {
				quizzes: items.map((item) => ({
					...item,
					link: context.links.sharedQuiz(group, item.quizId),
				})),
				hasMore,
			};
		},
	}),
	defineTool({
		name: "list_group_assignments",
		title: "List a group's open assignments",
		description: `The assignments posted in a group that are still open, with the link participants play by. ${WRITTEN_BY_PEOPLE}`,
		kind: "read",
		input: z.object({
			groupId,
			sort: z
				.enum(GROUP_ASSIGNMENT_SORTS)
				.optional()
				.describe("recent by default."),
		}),
		run: async ({ groupId: group, sort = "recent" }, context) => {
			const { items } = await context.useCases.listGroupAssignments({
				userId: context.identity.userId,
				groupId: group,
				sort,
			});
			return {
				assignments: items.map((item) => ({
					...item,
					link: context.links.assignment(item.gameId),
				})),
			};
		},
	}),
];
