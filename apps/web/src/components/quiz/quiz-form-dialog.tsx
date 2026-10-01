import { toast } from "sonner";

import type { QuizDetailsData } from "@/lib/api-types";
import { quizErrorMessage } from "@/lib/quiz-error-messages";
import { useQuizMutations, useUploadCover } from "@/lib/quiz-mutations";

import { QuizDetailsDialog } from "./quiz-details-dialog";

export type QuizFormDialogState = { quiz: QuizDetailsData } | null;

/** Edit dialog for a quiz's details, wired to the quiz API ("Configurações"). */
export function QuizFormDialog({
	state,
	onClose,
	onSaved,
}: {
	state: QuizFormDialogState;
	onClose: () => void;
	onSaved?: (quiz: QuizDetailsData) => void;
}) {
	const mutations = useQuizMutations();
	const uploadCover = useUploadCover();

	return (
		<QuizDetailsDialog
			open={state !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			initialValues={
				state
					? {
							title: state.quiz.title,
							description: state.quiz.description,
							visibility: state.quiz.visibility,
							coverImageUrl: state.quiz.coverImageUrl,
						}
					: undefined
			}
			uploadCover={uploadCover}
			onSubmit={async ({ cover, ...details }) => {
				if (!state) {
					return { error: null };
				}
				try {
					const quiz = await mutations.updateDetails.mutateAsync({
						quizId: state.quiz.id,
						...details,
						cover,
					});
					toast.success("Dados do quiz salvos.");
					onSaved?.(quiz);
					return { error: null };
				} catch (error) {
					return { error: { message: quizErrorMessage(error) } };
				}
			}}
		/>
	);
}
