import { CREATOR_NAME_LENGTH } from "@quizio/core/identity/domain/sign-up-rules";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";

async function accountOf({ useCases, identity }: ToolContext) {
	return useCases.getAccount({ userId: identity.userId });
}

/** The account and the profile of other creators (spec 044, RN-19). */
export const accountTools = [
	defineTool({
		name: "get_account",
		title: "Get the account",
		description:
			"The person you act for: name, email, photo and how many credits of Quizio's own AI assistant they have every 24 hours, used and left (each creation in the editor's assistant costs what the model used). Using these tools never spends credits.",
		kind: "read",
		input: z.object({}),
		run: async (_input, context) => {
			const [account, assistant] = await Promise.all([
				accountOf(context),
				context.useCases.getAssistantStatus({
					ownerId: context.identity.userId,
				}),
			]);
			return {
				account,
				aiAssistant: {
					enabled: assistant.enabled,
					creditsPerDay: assistant.limit,
					creditsUsed: assistant.used,
					creditsLeft: assistant.remaining,
				},
				links: {
					profile: context.links.profile(context.identity.userId),
					agentsSettings: context.links.agentsSettings(),
				},
			};
		},
	}),
	defineTool({
		name: "rename_account",
		title: "Rename the account",
		description: `Changes the person's name, shown to group members and on their profile: ${CREATOR_NAME_LENGTH.min} to ${CREATOR_NAME_LENGTH.max} characters.`,
		kind: "idempotent",
		input: z.object({ name: z.string().max(10_000) }),
		run: async ({ name }, context) => {
			await context.useCases.renameCreator({
				userId: context.identity.userId,
				name,
			});
			return { account: await accountOf(context) };
		},
	}),
	defineTool({
		name: "get_creator_profile",
		title: "Get a creator's profile",
		description:
			"Another creator's (or the person's own) profile: name, totals and public quizzes, which can be read with get_others_quiz, hosted, assigned or duplicated.",
		kind: "read",
		input: z.object({ userId: z.string().max(10_000) }),
		run: async ({ userId }, { useCases, identity, links }) => {
			const profile = await useCases.getCreatorProfile({
				viewerId: identity.userId,
				userId,
			});
			return {
				...profile,
				quizzes: profile.quizzes.map((quiz) => ({
					...quiz,
					links: { page: links.publicQuiz(userId, quiz.quizId) },
				})),
				links: { profile: links.profile(userId) },
			};
		},
	}),
];
