import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EditorActions } from "@/components/editor/quiz-editor";
import { useTRPC } from "@/utils/trpc";

import type { QuizEditorData } from "./api-types";
import {
	withQuestionChanged,
	withQuestionInserted,
	withQuestionMoved,
	withQuestionRemoved,
} from "./editor-cache";
import { quizErrorMessage } from "./quiz-error-messages";
import { useInvalidateQuizzes } from "./quiz-mutations";
import { useSaveTracker } from "./save-tracker";

const STRUCTURE = "structure";

/**
 * Offline, TanStack pauses mutations by default and the editor would say
 * "Salvando…" forever. Sending anyway surfaces the failure and its retry (RN-21).
 */
const SEND_EVEN_OFFLINE = { networkMode: "always" } as const;

/**
 * The editor's actions over tRPC (spec 003). Texts go through the autosave;
 * list changes are tracked too, but are not retried: a refused add or move is
 * rolled back and explained instead.
 */
export function useEditorActions(quizId: string): EditorActions {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const tracker = useSaveTracker();
	const invalidateListings = useInvalidateQuizzes();
	const editorKey = trpc.quiz.editor.queryKey({ quizId });

	const getData = () => queryClient.getQueryData<QuizEditorData>(editorKey);
	const setData = (update: (data: QuizEditorData) => QuizEditorData) =>
		queryClient.setQueryData<QuizEditorData>(editorKey, (data) =>
			data ? update(data) : data,
		);

	const rename = useMutation({
		...trpc.quiz.rename.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const update = useMutation({
		...trpc.quiz.questions.update.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const add = useMutation({
		...trpc.quiz.questions.add.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const duplicate = useMutation({
		...trpc.quiz.questions.duplicate.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const move = useMutation({
		...trpc.quiz.questions.move.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const remove = useMutation({
		...trpc.quiz.questions.delete.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const restore = useMutation({
		...trpc.quiz.questions.restore.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});

	/** Runs a list change; on failure rolls the cache back and explains why. */
	async function structural<T>(
		run: () => Promise<T>,
		previous?: QuizEditorData,
	): Promise<T | null> {
		let result: T | null = null;
		let failure: unknown;
		await tracker.track(
			STRUCTURE,
			async () => {
				try {
					result = await run();
				} catch (error) {
					failure = error;
					throw error;
				}
			},
			{ retryable: false },
		);
		if (failure !== undefined) {
			if (previous) {
				queryClient.setQueryData(editorKey, previous);
			}
			toast.error(quizErrorMessage(failure));
			return null;
		}
		void invalidateListings();
		return result;
	}

	const restoreQuestion = (
		deleted: Awaited<ReturnType<typeof remove.mutateAsync>>,
	) =>
		structural(async () => {
			const { index } = await restore.mutateAsync({ quizId, ...deleted });
			setData((data) => withQuestionInserted(data, deleted.question, index));
		});

	return {
		saveTitle: async (title) => {
			const quiz = await rename.mutateAsync({ quizId, title });
			setData((data) => ({ ...data, quiz: { ...data.quiz, ...quiz } }));
			void invalidateListings();
		},

		saveQuestionText: async (questionId, text) => {
			const question = await update.mutateAsync({
				quizId,
				questionId,
				changes: { text },
			});
			setData((data) => withQuestionChanged(data, question));
		},

		addQuestion: (afterQuestionId) =>
			structural(async () => {
				const placed = await add.mutateAsync({ quizId, afterQuestionId });
				setData((data) =>
					withQuestionInserted(data, placed.question, placed.index),
				);
				return placed;
			}),

		duplicateQuestion: (questionId) =>
			structural(async () => {
				const placed = await duplicate.mutateAsync({ quizId, questionId });
				setData((data) =>
					withQuestionInserted(data, placed.question, placed.index),
				);
				return placed;
			}),

		moveQuestion: (questionId, toIndex) => {
			const previous = getData();
			setData((data) => withQuestionMoved(data, questionId, toIndex));
			void structural(
				() => move.mutateAsync({ quizId, questionId, toIndex }),
				previous,
			);
		},

		deleteQuestion: (questionId) => {
			const previous = getData();
			setData((data) => withQuestionRemoved(data, questionId));
			void structural(
				() => remove.mutateAsync({ quizId, questionId }),
				previous,
			).then((deleted) => {
				if (deleted) {
					// Deleting is reversible, so no confirmation (spec 003, RN-14).
					toast("Pergunta excluída.", {
						action: {
							label: "Desfazer",
							onClick: () => void restoreQuestion(deleted),
						},
					});
				}
			});
		},
	};
}
