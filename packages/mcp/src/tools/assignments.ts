import type { AssignmentOptions } from "@quizio/core/game/domain/assignment";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { deadline } from "../schemas/deadline";

const gameId = z
	.string()
	.describe("The assignment's id, from create_assignment.");

/** "Mais opções" (spec 029, RN-14); what is not sent is the person's last choice. */
export const assignmentOptionsInput = z
	.object({
		questionTimer: z
			.boolean()
			.optional()
			.describe(
				"Each question has its time limit; off, no time and no points lost for slowness.",
			),
		randomizeAnswers: z
			.boolean()
			.optional()
			.describe("Each participant gets the answers in their own order."),
		gameCharacters: z
			.boolean()
			.optional()
			.describe("Participants pick an avatar before starting."),
	})
	.optional();

export async function assignmentOptionsFor(
	options: z.infer<typeof assignmentOptionsInput>,
	context: ToolContext,
): Promise<AssignmentOptions> {
	const { options: last } = await context.useCases.getAssignmentSetup({
		ownerId: context.identity.userId,
	});
	return {
		questionTimer: options?.questionTimer ?? last.questionTimer,
		randomizeAnswers: options?.randomizeAnswers ?? last.randomizeAnswers,
		gameCharacters: options?.gameCharacters ?? last.gameCharacters,
	};
}

/** Assignments: played by each participant at their own pace (spec 044, RN-27). */
export const assignmentTools = [
	defineTool({
		name: "create_assignment",
		title: "Assign a quiz",
		description:
			"Assigns a published quiz (the person's own, one shared in their group, or a public one) until a deadline: each participant plays it at their own pace, with the link or the 8-digit PIN. Later edits of the quiz do not reach it. Options not sent are the person's last choices. Its report fills as people play.",
		kind: "write",
		input: z.object({
			quizId: z.string(),
			deadline,
			options: assignmentOptionsInput,
		}),
		run: async ({ quizId, deadline: at, options }, context) => {
			const chosen = await assignmentOptionsFor(options, context);
			const due = new Date(at);
			const { gameId: id, pin } = await context.useCases.createAssignment({
				ownerId: context.identity.userId,
				quizId,
				deadline: due,
				options: chosen,
			});
			return {
				assignment: {
					gameId: id,
					pin,
					deadline: due.toISOString(),
					options: chosen,
				},
				links: {
					participants: context.links.assignment(id),
					join: context.links.join(pin),
					report: context.links.report(id),
				},
			};
		},
	}),
	defineTool({
		name: "change_assignment_deadline",
		title: "Change an assignment's deadline",
		description:
			"Moves the deadline of an open assignment, earlier or later, with the same rules as creating it.",
		kind: "idempotent",
		input: z.object({ gameId, deadline }),
		run: async ({ gameId: id, deadline: at }, context) => {
			const due = new Date(at);
			await context.useCases.changeAssignmentDeadline({
				ownerId: context.identity.userId,
				gameId: id,
				deadline: due,
			});
			return { assignment: { gameId: id, deadline: due.toISOString() } };
		},
	}),
	defineTool({
		name: "end_assignment",
		title: "End an assignment",
		description:
			"Ends an open assignment now: nobody else can play it, and whoever was in the middle stops where they were. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ gameId }),
		run: async ({ gameId: id }, context) => {
			await context.useCases.endAssignment({
				ownerId: context.identity.userId,
				gameId: id,
			});
			return { links: { report: context.links.report(id) } };
		},
	}),
	defineTool({
		name: "assign_to_groups",
		title: "Post an assignment in groups",
		description:
			"Posts the person's open assignment in their groups' feeds, once per group. Only in groups where they may assign (the admin, or members when the group allows it); list_groups shows the groups. Returns the groups it may go to, with where it already is.",
		kind: "write",
		input: z.object({
			gameId,
			groupIds: z.array(z.string()).min(1).max(50),
		}),
		run: async ({ gameId: id, groupIds }, context) => {
			const userId = context.identity.userId;
			const { assigned } = await context.useCases.assignToGroups({
				userId,
				gameId: id,
				groupIds,
			});
			const { groups } = await context.useCases.listAssignableGroups({
				userId,
				gameId: id,
			});
			return { assigned, groups };
		},
	}),
];
