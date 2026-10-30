import { LIBRARY_SECTIONS } from "@quizio/core/library/domain/library-section";
import { z } from "zod";

import { defineTool } from "../define-tool";
import { withStatementMarkup } from "../schemas/statement-markup";

/** The library and quizzes of other people (spec 044, RN-19, RN-20). */
export const libraryTools = [
	defineTool({
		name: "list_quizzes",
		title: "List the person's quizzes",
		description:
			"The person's own quizzes: recent (every quiz out of the trash, newest first), drafts (never published) or trash. Search matches titles, ignoring case and accents.",
		kind: "read",
		input: z.object({
			section: z
				.enum(LIBRARY_SECTIONS)
				.optional()
				.describe("recent by default."),
			search: z.string().max(10_000).optional(),
		}),
		run: async (
			{ section = "recent", search },
			{ useCases, identity, links },
		) => {
			const items = await useCases.listLibrary({
				ownerId: identity.userId,
				section,
				search: search ?? null,
			});
			return {
				quizzes: items.map((item) => ({
					...item,
					links: { editor: links.editor(item.id), page: links.quiz(item.id) },
				})),
			};
		},
	}),
	defineTool({
		name: "get_others_quiz",
		title: "Read someone else's quiz",
		description:
			"A quiz of another person, with its questions and right answers: one shared in a group the person is in (give groupId), or a public one (give ownerId, from get_creator_profile). It can be hosted, assigned or duplicated, never edited.",
		kind: "read",
		input: z
			.object({
				quizId: z.string().max(10_000),
				groupId: z.string().max(10_000).optional(),
				ownerId: z.string().max(10_000).optional(),
			})
			.refine((input) => input.groupId || input.ownerId, {
				message: "Give groupId for a shared quiz or ownerId for a public one.",
			}),
		run: async (
			{ quizId, groupId, ownerId },
			{ useCases, identity, links },
		) => {
			if (groupId) {
				const quiz = await useCases.getSharedQuiz({
					userId: identity.userId,
					groupId,
					quizId,
				});
				return {
					quiz: { ...quiz, questions: quiz.questions.map(withStatementMarkup) },
					links: { page: links.sharedQuiz(groupId, quizId) },
				};
			}
			const owner = ownerId ?? "";
			const quiz = await useCases.getPublicQuiz({
				viewerId: identity.userId,
				ownerId: owner,
				quizId,
			});
			return {
				quiz: { ...quiz, questions: quiz.questions.map(withStatementMarkup) },
				links: { page: links.publicQuiz(owner, quizId) },
			};
		},
	}),
];
