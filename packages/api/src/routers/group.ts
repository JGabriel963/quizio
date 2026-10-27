import { GROUP_ASSIGNMENT_SORTS } from "@quizio/core/groups/domain/group-assignment";
import { GROUP_FILE_TYPES } from "@quizio/core/groups/domain/group-file";
import { GROUP_PERMISSIONS } from "@quizio/core/groups/domain/group-permissions";
import { GROUP_SECTIONS } from "@quizio/core/groups/domain/group-section";
import {
	MAX_QUIZZES_PER_SHARE,
	SHARED_QUIZ_SORTS,
} from "@quizio/core/groups/domain/shared-quiz";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const groupId = z.string().min(1).max(100);
const search = z.string().max(200).optional();
const inGroup = z.object({ groupId });
const code = z.object({ code: z.string().min(1).max(100) });
const gameId = z.string().min(1).max(100);
/** An instant with its zone, as the browser's `toISOString()` sends it. */
const deadline = z.iso
	.datetime({ offset: true })
	.transform((value) => new Date(value));

/** Where the next page of the feed starts, as `group.feed` sent it. */
const feedCursor = z.object({
	createdAt: z.iso
		.datetime({ offset: true })
		.transform((value) => new Date(value)),
	id: z.string().min(1).max(100),
});
/** A key the server signed under the group; the use cases check it. */
const uploadKey = z.string().min(1).max(300);
const quizId = z.string().min(1).max(100);

/** "Compartilhado" (spec 037). */
const sharedRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				groupId,
				sort: z.enum(SHARED_QUIZ_SORTS),
				limit: z.number().int().min(1).max(200).optional(),
			}),
		)
		.query(({ ctx, input }) =>
			ctx.container.useCases.listSharedQuizzes({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** "Já compartilhado" in "Selecionar kahoot" (RN-04). */
	ids: protectedProcedure.input(inGroup).query(({ ctx, input }) =>
		ctx.container.useCases.listSharedQuizIds({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	get: protectedProcedure
		.input(z.object({ groupId, quizId }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.getSharedQuiz({
				userId: ctx.session.user.id,
				...input,
			}),
		),
});

/** The feed's posts: likes and "Excluir publicação" (spec 038). */
const postsRouter = router({
	/** One post, for the page a notification opens (spec 040, RN-19). */
	get: protectedProcedure
		.input(z.object({ groupId, postId: z.string().min(1).max(100) }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.getGroupPost({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	setLike: protectedProcedure
		.input(
			z.object({
				groupId,
				postId: z.string().min(1).max(100),
				liked: z.boolean(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.setPostLike({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	delete: protectedProcedure
		.input(z.object({ groupId, postId: z.string().min(1).max(100) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.deleteGroupPost({
				userId: ctx.session.user.id,
				...input,
			}),
		),
});

/** The invite link: the admin's code and the guest's screen (spec 034, RN-21 to RN-29). */
const inviteRouter = router({
	get: protectedProcedure.input(inGroup).query(({ ctx, input }) =>
		ctx.container.useCases.getGroupInvite({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	reset: protectedProcedure.input(inGroup).mutation(({ ctx, input }) =>
		ctx.container.useCases.resetGroupInvite({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	find: protectedProcedure.input(code).query(({ ctx, input }) =>
		ctx.container.useCases.getGroupInvitation({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	accept: protectedProcedure.input(code).mutation(({ ctx, input }) =>
		ctx.container.useCases.acceptGroupInvite({
			userId: ctx.session.user.id,
			...input,
		}),
	),
});

/** "Configurações do grupo", the admin's (spec 035). */
const settingsRouter = router({
	get: protectedProcedure.input(inGroup).query(({ ctx, input }) =>
		ctx.container.useCases.getGroupSettings({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	updateDetails: protectedProcedure
		// The lengths are the domain's rules, counted in characters (RN-04).
		.input(
			z.object({
				groupId,
				name: z.string().max(1000),
				description: z.string().max(5000),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.updateGroupDetails({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	setPermission: protectedProcedure
		.input(
			z.object({
				groupId,
				permission: z.enum(GROUP_PERMISSIONS),
				value: z.boolean(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.setGroupPermission({
				userId: ctx.session.user.id,
				...input,
			}),
		),
});

/** Groups of who is signed in (spec 034): membership is checked by every use case. */
export const groupRouter = router({
	list: protectedProcedure
		.input(z.object({ section: z.enum(GROUP_SECTIONS), search }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.listGroups({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	recent: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.listRecentGroups({ userId: ctx.session.user.id }),
	),

	create: protectedProcedure
		// The length is the domain's rule, counted in characters (RN-03).
		.input(z.object({ name: z.string().max(1000) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.createGroup({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	get: protectedProcedure.input(inGroup).query(({ ctx, input }) =>
		ctx.container.useCases.getGroup({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	visit: protectedProcedure.input(inGroup).mutation(({ ctx, input }) =>
		ctx.container.useCases.visitGroup({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	dismissSetup: protectedProcedure.input(inGroup).mutation(({ ctx, input }) =>
		ctx.container.useCases.dismissGroupSetup({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	members: protectedProcedure
		.input(z.object({ groupId, search }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.listGroupMembers({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	removeMember: protectedProcedure
		.input(z.object({ groupId, userId: z.string().min(1).max(100) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.removeGroupMember({
				userId: ctx.session.user.id,
				groupId: input.groupId,
				memberId: input.userId,
			}),
		),

	leave: protectedProcedure.input(inGroup).mutation(({ ctx, input }) =>
		ctx.container.useCases.leaveGroup({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	delete: protectedProcedure.input(inGroup).mutation(({ ctx, input }) =>
		ctx.container.useCases.deleteGroup({
			userId: ctx.session.user.id,
			...input,
		}),
	),

	/** "Atribuir agora" and "Publicar" (spec 038). */
	assign: protectedProcedure
		.input(
			z.object({
				groupId,
				quizId: z.string().min(1).max(100),
				deadline,
				options: z.object({
					gameCharacters: z.boolean(),
					questionTimer: z.boolean(),
					randomizeAnswers: z.boolean(),
				}),
				// The length is the domain's rule, counted in characters (RN-12).
				message: z.string().max(5000).optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.assignInGroup({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** "Mostrar mais publicações" sends back the page's `nextCursor` (spec 036, RN-18). */
	feed: protectedProcedure
		.input(z.object({ groupId, cursor: feedCursor.optional() }))
		.query(async ({ ctx, input }) => {
			const { posts, nextCursor } = await ctx.container.useCases.listGroupFeed({
				userId: ctx.session.user.id,
				...input,
			});
			return {
				posts,
				nextCursor: nextCursor && {
					createdAt: nextCursor.createdAt.toISOString(),
					id: nextCursor.id,
				},
			};
		}),

	/** "Publicar" of "Criar publicação": text, a file, or both (spec 036). */
	post: protectedProcedure
		.input(
			z.object({
				groupId,
				// The length is the domain's rule, counted in characters (RN-05).
				message: z.string().max(5000),
				uploadKey: uploadKey.optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.createGroupPost({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** Imagem and PDF: a presigned upload under the group (spec 036; ADR 0017). */
	requestUpload: protectedProcedure
		.input(
			z.object({
				groupId,
				type: z.enum(GROUP_FILE_TYPES),
				contentType: z.string().min(1).max(100),
				sizeBytes: z.number().int(),
				fileName: z.string().max(1000),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.requestGroupUpload({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** Cancelar and X: one's own pending file goes (spec 036, RN-08). */
	discardUpload: protectedProcedure
		.input(z.object({ groupId, key: uploadKey }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.discardGroupUpload({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** "Compartilhar N kahoots" and "Publicar" with a quiz (spec 037, RN-06, RN-08). */
	share: protectedProcedure
		.input(
			z.object({
				groupId,
				quizIds: z.array(quizId).min(1).max(MAX_QUIZZES_PER_SHARE),
				// The length is the domain's rule, counted in characters.
				message: z.string().max(5000).optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.shareQuizzesInGroup({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** "Remover do grupo" (spec 037, RN-13). */
	unshare: protectedProcedure
		.input(z.object({ groupId, quizId }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.unshareQuiz({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	assignments: protectedProcedure
		.input(z.object({ groupId, sort: z.enum(GROUP_ASSIGNMENT_SORTS) }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.listGroupAssignments({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	/** "Atribuir a grupos" (spec 038, RN-25 to RN-28). */
	assignableGroups: protectedProcedure
		.input(z.object({ gameId }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.listAssignableGroups({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	assignToGroups: protectedProcedure
		.input(z.object({ gameId, groupIds: z.array(groupId).min(1).max(50) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.assignToGroups({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	posts: postsRouter,
	shared: sharedRouter,
	invite: inviteRouter,
	settings: settingsRouter,
});
