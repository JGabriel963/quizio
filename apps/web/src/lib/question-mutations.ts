import {
	applyQuestionChange,
	ChoiceNotFoundError,
	type QuestionChange,
	QuestionChangeNotApplicableError,
} from "@quizio/core/quiz/domain/question-change";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import type { EditorActions } from "@/components/editor/quiz-editor";
import { useTRPC } from "@/utils/trpc";

import type { QuizEditorData } from "./api-types";
import {
	withQuestionChanged,
	withQuestionInserted,
	withQuestionMoved,
	withQuestionRemoved,
	withTimeLimitForAll,
} from "./editor-cache";
import { changeNoticeMessage, timeAppliedMessage } from "./question-labels";
import {
	createRememberedContents,
	typeChangeFor,
} from "./question-type-change";
import { isDomainRefusal, quizErrorMessage } from "./quiz-error-messages";
import { useInvalidateQuizzes } from "./quiz-mutations";
import { useSaveTracker } from "./save-tracker";

const STRUCTURE = "structure";

/**
 * Offline, TanStack pauses mutations by default and the editor would say
 * "Salvando…" forever. Sending anyway surfaces the failure and its retry (RN-21).
 */
const SEND_EVEN_OFFLINE = { networkMode: "always" } as const;

/** Save-tracker key of a change: a newer change of the same field replaces an older failure. */
function changeKey(questionId: string, change: QuestionChange): string {
	const field =
		change.kind === "choiceText" || change.kind === "choiceCorrect"
			? `choice:${change.choiceId}:${change.kind}`
			: change.kind;
	return `question:${questionId}:${field}`;
}

/**
 * The editor's actions over tRPC (specs 003 to 005). Texts go through the
 * autosave; list changes are tracked too, but are not retried: a refused add
 * or move is rolled back and explained instead.
 *
 * The server rewrites whole question rows (and `saveList` the whole list), so
 * every write goes through one queue: two writes never race and lose a change
 * (plan 004, Riscos). Question changes are applied to the cache at once with
 * the core's own rules, and the server's answer is kept once nothing else is
 * queued.
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

	const applyToAll = useMutation({
		...trpc.quiz.questions.applyTimeLimitToAll.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});

	const queue = useRef({
		tail: Promise.resolve() as Promise<unknown>,
		size: 0,
	});
	function enqueue<T>(run: () => Promise<T>): Promise<T> {
		const current = queue.current;
		current.size += 1;
		const result = current.tail.then(run);
		current.tail = result
			.catch(() => {})
			.finally(() => {
				current.size -= 1;
			});
		return result;
	}
	const nothingElseQueued = () => queue.current.size === 1;

	/** Lives as long as the editor is open: a reload forgets it (spec 005, RN-18). */
	const remembered = useRef(createRememberedContents());

	/**
	 * Applies the change to the cache and returns how to send it, or null when
	 * there is nothing to send: the question is gone, or the answer was
	 * discarded with the extra answers (RN-03). Throws a refused change.
	 */
	function prepareChange(questionId: string, change: QuestionChange) {
		const current = getData()?.questions.find(({ id }) => id === questionId);
		if (!current) {
			return null;
		}
		let result: ReturnType<typeof applyQuestionChange>;
		try {
			result = applyQuestionChange(current, change);
		} catch (error) {
			if (
				error instanceof ChoiceNotFoundError ||
				// A late save of a field the question lost with its type (spec 005).
				error instanceof QuestionChangeNotApplicableError
			) {
				return null;
			}
			throw error;
		}
		setData((data) => withQuestionChanged(data, result.question));
		if (result.notice) {
			toast(changeNoticeMessage(result.notice));
		}
		return () =>
			enqueue(async () => {
				const saved = await update.mutateAsync({
					quizId,
					questionId,
					// The core just accepted it, so its raw values are the API's enums.
					change: change as Parameters<typeof update.mutateAsync>[0]["change"],
				});
				if (nothingElseQueued()) {
					setData((data) => withQuestionChanged(data, saved.question));
				}
			});
	}

	/**
	 * A change saved at once is retried like a text when the connection fails;
	 * one the server refuses is explained and the editor reloads its state.
	 */
	function track(key: string, send: () => Promise<unknown>) {
		void tracker.track(key, async () => {
			try {
				await send();
			} catch (error) {
				if (!isDomainRefusal(error)) {
					throw error;
				}
				toast.error(quizErrorMessage(error));
				void queryClient.invalidateQueries({ queryKey: editorKey });
			}
		});
	}

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
					result = await enqueue(run);
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

	const changeQuestion: EditorActions["changeQuestion"] = (
		questionId,
		change,
	) => {
		let send: ReturnType<typeof prepareChange>;
		try {
			send = prepareChange(questionId, change);
		} catch (error) {
			toast.error(quizErrorMessage(error));
			return;
		}
		if (send) {
			track(changeKey(questionId, change), send);
		}
	};

	return {
		saveTitle: async (title) => {
			const quiz = await rename.mutateAsync({ quizId, title });
			setData((data) => ({ ...data, quiz: { ...data.quiz, ...quiz } }));
			void invalidateListings();
		},

		saveQuestionField: async (questionId, change) => {
			await prepareChange(questionId, change)?.();
		},

		changeQuestion,

		changeQuestionType: (questionId, type) => {
			const current = getData()?.questions.find(({ id }) => id === questionId);
			const change =
				current && typeChangeFor(remembered.current, current, type);
			if (change) {
				changeQuestion(questionId, change);
			}
		},

		applyTimeLimitToAll: (seconds) => {
			setData((data) => withTimeLimitForAll(data, seconds));
			track("quiz:timeLimitForAll", async () => {
				const { updatedCount } = await enqueue(() =>
					applyToAll.mutateAsync({ quizId, seconds }),
				);
				toast(timeAppliedMessage(updatedCount));
			});
		},

		addQuestion: (afterQuestionId, type) =>
			structural(async () => {
				const placed = await add.mutateAsync({
					quizId,
					afterQuestionId,
					type,
				});
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
			// The editor asked for confirmation first; there is no undo (spec 003, RN-14).
			void structural(
				() => remove.mutateAsync({ quizId, questionId }),
				previous,
			);
		},
	};
}
