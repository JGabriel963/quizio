import { useEffect, useReducer } from "react";

import type { AssignmentSetupData } from "@/components/assignment/assign-dialog";
import type { LibraryItemView } from "@/lib/api-types";
import {
	type AssignSettings,
	groupAssignReducer,
	initialGroupAssignState,
} from "@/lib/group-assign-state";

import { AssignmentPostDialog } from "./assignment-post-dialog";
import { AssignmentSettingsDialog } from "./assignment-settings-dialog";
import { SelectQuizDialog } from "./select-quiz-dialog";

export interface GroupAssignInput extends AssignSettings {
	quizId: string;
	/** Present when it came from "Criar publicação" (RN-11). */
	message?: string;
}

/**
 * "Atribuir" in a group (spec 038, RN-04 to RN-11): the three dialogs over a
 * pure reducer. The caller assigns; a refusal keeps the dialog open.
 */
export function AssignInGroupFlow({
	open,
	quizzes,
	ownerName,
	setup,
	now,
	onAssign,
	onClose,
}: {
	open: boolean;
	quizzes: readonly LibraryItemView[] | undefined;
	ownerName: string;
	setup: AssignmentSetupData | undefined;
	now: Date;
	onAssign: (input: GroupAssignInput) => Promise<unknown>;
	onClose: () => void;
}) {
	const [state, dispatch] = useReducer(
		groupAssignReducer,
		initialGroupAssignState,
	);

	// Every opening starts at the choice of the quiz.
	useEffect(() => {
		dispatch({ type: open ? "open" : "close" });
	}, [open]);

	const close = () => {
		dispatch({ type: "close" });
		onClose();
	};

	return (
		<>
			<SelectQuizDialog
				open={state.step === "select"}
				quizzes={quizzes}
				ownerName={ownerName}
				onPick={(quiz) => dispatch({ type: "pick", quiz })}
				onClose={close}
			/>
			{state.step === "configure" && state.quiz && (
				<AssignmentSettingsDialog
					open
					setup={setup}
					now={now}
					onAssignNow={async (settings) => {
						await onAssign({ quizId: state.quiz?.id ?? "", ...settings });
						close();
					}}
					onAddMessage={(settings) =>
						dispatch({ type: "addMessage", ...settings })
					}
					onClose={close}
				/>
			)}
			{state.step === "message" && state.quiz && state.settings && (
				<AssignmentPostDialog
					open
					quiz={state.quiz}
					message={state.message}
					onMessageChange={(text) => dispatch({ type: "message", text })}
					onRemoveQuiz={() => dispatch({ type: "removeQuiz" })}
					onCancel={close}
					onPublish={async () => {
						if (!state.quiz || !state.settings) {
							return;
						}
						await onAssign({
							quizId: state.quiz.id,
							...state.settings,
							message: state.message,
						});
						close();
					}}
				/>
			)}
		</>
	);
}
