import { createContext, type ReactNode, use, useMemo, useState } from "react";

import {
	QuizFormDialog,
	type QuizFormDialogState,
} from "@/components/quiz/quiz-form-dialog";

export interface CreateQuizContextValue {
	/** Opens the quiz details dialog in create mode (spec 002, RN-13). */
	openCreateQuiz: () => void;
}

export const CreateQuizContext = createContext<CreateQuizContextValue>({
	openCreateQuiz: () => {},
});

export const useCreateQuiz = () => use(CreateQuizContext);

/**
 * Hosts the create dialog once for the whole creator area, so the top bar and
 * any screen inside it open the same form (spec 002, RN-13).
 */
export function CreateQuizProvider({ children }: { children: ReactNode }) {
	const [dialog, setDialog] = useState<QuizFormDialogState>(null);
	const value = useMemo(
		() => ({ openCreateQuiz: () => setDialog({ mode: "create" }) }),
		[],
	);

	return (
		<CreateQuizContext value={value}>
			{children}
			<QuizFormDialog state={dialog} onClose={() => setDialog(null)} />
		</CreateQuizContext>
	);
}
