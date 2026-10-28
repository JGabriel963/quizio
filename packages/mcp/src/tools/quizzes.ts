import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import { QuizNotFoundError } from "@quizio/core/quiz/domain/quiz";
import {
	QUIZ_DESCRIPTION_MAX_LENGTH,
	QUIZ_TITLE_MAX_LENGTH,
} from "@quizio/core/quiz/domain/quiz-details";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { fileSource, resolveFile } from "../schemas/file-source";
import {
	questionInput,
	questionOutput,
	toQuestionDraft,
} from "../schemas/question-input";
import { themeChoice, toThemeChoice } from "../schemas/theme-choice";

const quizId = z.string().describe("The quiz's id.");
const visibility = z
	.enum(["private", "public"])
	.describe(
		"private (only the owner) or public (on the owner's profile, anybody may play, assign or duplicate it).",
	);

function quizAnswer<View extends { id: string }>(
	quiz: View,
	{ links }: ToolContext,
) {
	return {
		quiz,
		links: { editor: links.editor(quiz.id), page: links.quiz(quiz.id) },
	};
}

async function editorAnswer(quizIdValue: string, context: ToolContext) {
	const view = await context.useCases.getQuizEditor({
		ownerId: context.identity.userId,
		quizId: quizIdValue,
	});
	return {
		...quizAnswer(view.quiz, context),
		questions: view.questions.map((question, index) =>
			questionOutput(question, index + 1, view.imageUrls),
		),
	};
}

/** Quizzes: create, read, change, publish and the trash (spec 044, RN-20, RN-23). */
export const quizTools = [
	defineTool({
		name: "create_quiz",
		title: "Create a quiz",
		description: `Creates a quiz in the person's library, as a draft, with its questions in one call (every question an agent adds is marked as made with AI). Title up to ${QUIZ_TITLE_MAX_LENGTH} characters, description up to ${QUIZ_DESCRIPTION_MAX_LENGTH}, up to ${QUIZ_MAX_QUESTIONS} questions. Incomplete questions are kept; get_quiz says what each still needs, and publish_quiz makes it playable.`,
		kind: "write",
		input: z.object({
			title: z.string().nullish(),
			description: z.string().nullish(),
			visibility: visibility.optional(),
			cover: fileSource.optional().describe("The cover image."),
			theme: themeChoice.optional(),
			questions: z.array(questionInput).max(QUIZ_MAX_QUESTIONS).optional(),
		}),
		run: async ({ cover, theme, questions = [], ...details }, context) => {
			const coverImageKey = cover
				? await resolveFile(cover, { kind: "media" }, context)
				: null;
			const drafts = await Promise.all(
				questions.map((question) => toQuestionDraft(question, context)),
			);
			const quiz = await context.useCases.createQuiz({
				ownerId: context.identity.userId,
				...details,
				coverImageKey,
				theme: theme ? toThemeChoice(theme) : undefined,
				questions: drafts,
			});
			return quizAnswer(quiz, context);
		},
	}),
	defineTool({
		name: "get_quiz",
		title: "Read a quiz",
		description:
			"One of the person's quizzes with every question in order: answers, the right ones, the time, the image, and the issues that keep it from being published (missingText, notEnoughAnswers, noCorrectAnswer…).",
		kind: "read",
		input: z.object({ quizId }),
		run: async ({ quizId: id }, context) => editorAnswer(id, context),
	}),
	defineTool({
		name: "update_quiz",
		title: "Change a quiz's details",
		description:
			"Changes only what is sent: title, description, cover (null removes it), visibility and theme. Questions are changed with the question tools.",
		kind: "idempotent",
		input: z.object({
			quizId,
			title: z.string().nullish(),
			description: z.string().nullish(),
			visibility: visibility.optional(),
			cover: fileSource
				.nullish()
				.describe("A new cover, or null to remove it."),
			theme: themeChoice.optional(),
		}),
		run: async (
			{
				quizId: id,
				title,
				description,
				visibility: newVisibility,
				cover,
				theme,
			},
			context,
		) => {
			const ref = { ownerId: context.identity.userId, quizId: id };
			const { useCases } = context;
			let quiz = await useCases.getQuizDetails(ref);
			if (
				title !== undefined ||
				description !== undefined ||
				cover !== undefined
			) {
				quiz = {
					...quiz,
					...(await useCases.updateQuizDetails({
						...ref,
						title: title === undefined ? quiz.title : title,
						description:
							description === undefined ? quiz.description : description,
						visibility: newVisibility ?? quiz.visibility,
						cover:
							cover === undefined
								? { type: "keep" }
								: cover === null
									? { type: "remove" }
									: {
											type: "set",
											key: await resolveFile(cover, { kind: "media" }, context),
										},
					})),
				};
			} else if (newVisibility) {
				quiz = {
					...quiz,
					...(await useCases.setQuizVisibility({
						...ref,
						visibility: newVisibility,
					})),
				};
			}
			if (theme) {
				quiz = {
					...quiz,
					...(await useCases.setQuizTheme({
						...ref,
						choice: toThemeChoice(theme),
					})),
				};
			}
			const { customTheme: _look, ...details } = quiz;
			return quizAnswer(details, context);
		},
	}),
	defineTool({
		name: "duplicate_quiz",
		title: "Duplicate a quiz",
		description:
			"Copies a quiz into the person's library: their own, one shared in their group, or a public one. A copy of someone else's quiz is private and can be edited.",
		kind: "write",
		input: z.object({ quizId }),
		run: async ({ quizId: id }, context) => {
			const { useCases, identity } = context;
			try {
				return quizAnswer(
					await useCases.duplicateQuiz({
						ownerId: identity.userId,
						quizId: id,
					}),
					context,
				);
			} catch (error) {
				if (!(error instanceof QuizNotFoundError)) {
					throw error;
				}
				return quizAnswer(
					await useCases.duplicateSharedQuiz({
						userId: identity.userId,
						quizId: id,
					}),
					context,
				);
			}
		},
	}),
	defineTool({
		name: "set_quiz_trashed",
		title: "Move a quiz to the trash or back",
		description:
			"trashed: true moves the quiz to the trash (it can be restored), false restores it.",
		kind: "idempotent",
		input: z.object({ quizId, trashed: z.boolean() }),
		run: async ({ quizId: id, trashed }, { useCases, identity }) => {
			const ref = { ownerId: identity.userId, quizId: id };
			await (trashed
				? useCases.moveQuizToTrash(ref)
				: useCases.restoreQuiz(ref));
			return { quizId: id, trashed };
		},
	}),
	defineTool({
		name: "delete_quiz_permanently",
		title: "Delete a quiz for good",
		description:
			"Deletes a quiz in the trash for good, with its images. Cannot be undone: confirm with the person first. Reports of games already played stay.",
		kind: "destructive",
		input: z.object({ quizId }),
		run: async ({ quizId: id }, { useCases, identity }) => {
			await useCases.deleteQuizPermanently({
				ownerId: identity.userId,
				quizId: id,
			});
			return { deleted: id };
		},
	}),
	defineTool({
		name: "publish_quiz",
		title: "Publish a quiz",
		description:
			"Saves the playable version, which games and assignments use. Refused while a question is incomplete: the error lists each one by position with its issues. A quiz without a title needs one here.",
		kind: "write",
		input: z.object({
			quizId,
			title: z.string().nullish().describe("When the quiz has no title yet."),
			description: z.string().nullish(),
		}),
		run: async ({ quizId: id, title, description }, context) => {
			const quiz = await context.useCases.publishQuiz({
				ownerId: context.identity.userId,
				quizId: id,
				details:
					title !== undefined || description !== undefined
						? { title: title ?? null, description: description ?? null }
						: undefined,
			});
			return quizAnswer(quiz, context);
		},
	}),
	defineTool({
		name: "discard_quiz_changes",
		title: "Discard unpublished changes",
		description:
			"Puts the questions back as they are in the published version, losing every change made since. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ quizId }),
		run: async ({ quizId: id }, context) => {
			await context.useCases.discardQuizChanges({
				ownerId: context.identity.userId,
				quizId: id,
			});
			return editorAnswer(id, context);
		},
	}),
];
