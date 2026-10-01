import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, use, useMemo } from "react";
import { toast } from "sonner";

import { quizErrorMessage } from "@/lib/quiz-error-messages";
import { useQuizMutations } from "@/lib/quiz-mutations";

export interface CreateQuizContextValue {
	/** Creates a blank draft and opens its editor (spec 003, RN-04). */
	createQuiz: () => void;
	/** True while a quiz is being created, so a double click creates one draft. */
	creating: boolean;
}

export const CreateQuizContext = createContext<CreateQuizContextValue>({
	createQuiz: () => {},
	creating: false,
});

export const useCreateQuiz = () => use(CreateQuizContext);

/**
 * One Criar for the whole creator area: the top bar and every empty state
 * create the same way (spec 002, RN-13; spec 003, RN-04).
 */
export function CreateQuizProvider({ children }: { children: ReactNode }) {
	const { create } = useQuizMutations();
	const navigate = useNavigate();
	const { mutate, isPending } = create;

	const value = useMemo(
		() => ({
			creating: isPending,
			createQuiz: () =>
				mutate(
					{},
					{
						onSuccess: (quiz) =>
							navigate({
								to: "/creator/$quizId",
								params: { quizId: quiz.id },
							}),
						onError: (error) => toast.error(quizErrorMessage(error)),
					},
				),
		}),
		[isPending, mutate, navigate],
	);

	return <CreateQuizContext value={value}>{children}</CreateQuizContext>;
}
