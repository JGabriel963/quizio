import { GROUP_PERMISSIONS } from "@quizio/core/groups/domain/group-permissions";
import { GROUP_SECTIONS } from "@quizio/core/groups/domain/group-section";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const groupId = z.string().min(1).max(100);
const search = z.string().max(200).optional();
const inGroup = z.object({ groupId });
const code = z.object({ code: z.string().min(1).max(100) });

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

	invite: inviteRouter,
	settings: settingsRouter,
});
