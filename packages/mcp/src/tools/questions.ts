import { imageKeysOf } from "@quizio/core/quiz/application/question-images";
import { TIME_LIMITS_SECONDS } from "@quizio/core/quiz/domain/question";
import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import {
	questionChanges,
	questionInput,
	questionOutput,
	toQuestionDraft,
	toQuestionPatch,
} from "../schemas/question-input";

const quizId = z.string().max(10_000).describe("The quiz's id.");
const questionId = z
	.string()
	.max(10_000)
	.describe("The question's id, from get_quiz.");

async function imageUrlsOf(quizIdValue: string, context: ToolContext) {
	return (
		await context.useCases.getQuizEditor({
			ownerId: context.identity.userId,
			quizId: quizIdValue,
		})
	).imageUrls;
}

/** The questions of a quiz (spec 044, RN-21, RN-22). */
export const questionTools = [
	defineTool({
		name: "add_questions",
		title: "Add questions",
		description: `Adds one or more questions of any type, after the given question or at the end; a quiz's lone blank question is replaced. Each is marked as made with AI. Limits refuse the call (nothing is added); what is missing does not, and the answer lists each question's issues. Up to ${QUIZ_MAX_QUESTIONS} questions in a quiz.`,
		kind: "write",
		input: z.object({
			quizId,
			afterQuestionId: z
				.string()
				.max(10_000)
				.nullish()
				.describe("Insert right after this question; at the end when missing."),
			questions: z.array(questionInput).min(1).max(QUIZ_MAX_QUESTIONS),
		}),
		run: async ({ quizId: id, afterQuestionId, questions }, context) => {
			const drafts = await Promise.all(
				questions.map((question) => toQuestionDraft(question, context)),
			);
			const added = await context.useCases.addQuestions({
				ownerId: context.identity.userId,
				quizId: id,
				afterQuestionId: afterQuestionId ?? null,
				questions: drafts,
			});
			const imageUrls =
				imageKeysOf(added.questions).length > 0
					? await imageUrlsOf(id, context)
					: {};
			return {
				questions: added.questions.map((question, index) =>
					questionOutput(question, added.firstIndex + index + 1, imageUrls),
				),
				links: { editor: context.links.editor(id) },
			};
		},
	}),
	defineTool({
		name: "update_question",
		title: "Change a question",
		description:
			"Changes only the fields sent: statement, time, points, type, answers, image. A list (choices, acceptedAnswers, items) is replaced whole; slider fields merge. Whether it was made with AI does not change.",
		kind: "idempotent",
		input: z.object({ quizId, questionId, changes: questionChanges }),
		run: async ({ quizId: id, questionId: qid, changes }, context) => {
			const { question } = await context.useCases.editQuestion({
				ownerId: context.identity.userId,
				quizId: id,
				questionId: qid,
				patch: await toQuestionPatch(changes, context),
			});
			const view = await context.useCases.getQuizEditor({
				ownerId: context.identity.userId,
				quizId: id,
			});
			const position =
				view.questions.findIndex((each) => each.id === question.id) + 1;
			return { question: questionOutput(question, position, view.imageUrls) };
		},
	}),
	defineTool({
		name: "duplicate_question",
		title: "Duplicate a question",
		description:
			"Copies a question right after it, with its image and whether it was made with AI.",
		kind: "write",
		input: z.object({ quizId, questionId }),
		run: async ({ quizId: id, questionId: qid }, context) => {
			const placed = await context.useCases.duplicateQuestion({
				ownerId: context.identity.userId,
				quizId: id,
				questionId: qid,
			});
			return { question: questionOutput(placed.question, placed.index + 1) };
		},
	}),
	defineTool({
		name: "move_question",
		title: "Move a question",
		description: "Moves a question to a position, counting from 1.",
		kind: "idempotent",
		input: z.object({
			quizId,
			questionId,
			toPosition: z.number().int().min(1),
		}),
		run: async ({ quizId: id, questionId: qid, toPosition }, context) => {
			await context.useCases.moveQuestion({
				ownerId: context.identity.userId,
				quizId: id,
				questionId: qid,
				toIndex: toPosition - 1,
			});
			return { questionId: qid, position: toPosition };
		},
	}),
	defineTool({
		name: "delete_question",
		title: "Delete a question",
		description:
			"Deletes a question; a quiz always keeps at least one. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ quizId, questionId }),
		run: async ({ quizId: id, questionId: qid }, context) => {
			await context.useCases.deleteQuestion({
				ownerId: context.identity.userId,
				quizId: id,
				questionId: qid,
			});
			return { deleted: qid };
		},
	}),
	defineTool({
		name: "set_time_limit_for_all",
		title: "Set the time of every question",
		description: `Gives every question this time, fitted to what each type takes. Seconds: ${TIME_LIMITS_SECONDS.join(", ")}.`,
		kind: "idempotent",
		input: z.object({ quizId, seconds: z.number().int() }),
		run: async ({ quizId: id, seconds }, context) =>
			context.useCases.applyTimeLimitToAll({
				ownerId: context.identity.userId,
				quizId: id,
				seconds,
			}),
	}),
];
