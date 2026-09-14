import { toast } from "sonner";

import type { QuizDetailsData } from "@/lib/api-types";
import { quizErrorMessage } from "@/lib/quiz-error-messages";
import { useQuizMutations, useUploadCover } from "@/lib/quiz-mutations";

import { QuizDetailsDialog } from "./quiz-details-dialog";

export type QuizFormDialogState =
	| { mode: "create" }
	| { mode: "edit"; quiz: QuizDetailsData }
	| null;

/** Create/edit dialog wired to the quiz API. */
export function QuizFormDialog({
	state,
	onClose,
}: {
	state: QuizFormDialogState;
	onClose: () => void;
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
			mode={state?.mode ?? "create"}
			initialValues={
				state?.mode === "edit"
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
				try {
					if (state?.mode === "edit") {
						await mutations.updateDetails.mutateAsync({
							quizId: state.quiz.id,
							...details,
							cover,
						});
						toast.success("Dados do quiz salvos.");
					} else {
						await mutations.create.mutateAsync({
							...details,
							coverImageKey: cover.type === "set" ? cover.key : null,
						});
						toast.success("Quiz criado.");
					}
					return { error: null };
				} catch (error) {
					return { error: { message: quizErrorMessage(error) } };
				}
			}}
		/>
	);
}
