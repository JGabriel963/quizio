import { useState } from "react";

import {
	AssignDialog,
	type AssignmentOptionsData,
	type AssignmentSetupData,
} from "./assign-dialog";
import { OpenAssignmentsDialog } from "./open-assignments-dialog";
import {
	ShareAssignmentDialog,
	type ShareableAssignment,
} from "./share-assignment-dialog";

/**
 * "Atribuir" from start to end (spec 029, RN-06 to RN-26): "Configurar
 * atividade", then "Compartilhe com os participantes". The caller creates the
 * assignment and says, when the share dialog closes, where to find it.
 */
export function AssignFlow({
	open,
	onOpenChange,
	quizTitle,
	setup,
	now,
	origin,
	openAssignments,
	onCreate,
	onDone,
	onAssignToGroups,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The activity's name: the quiz's title now (RN-28). */
	quizTitle: string;
	setup: AssignmentSetupData | undefined;
	now: Date;
	origin: string;
	/**
	 * The quiz's open assignments, shown first when there is any (RN-05a);
	 * undefined while they load.
	 */
	openAssignments: ShareableAssignment[] | undefined;
	onCreate: (input: {
		deadline: Date;
		options: AssignmentOptionsData;
	}) => Promise<{ gameId: string; pin: string }>;
	onDone: (assignment: { gameId: string }) => void;
	/** "Atribuir a grupos" over the share dialog (spec 038, RN-25). */
	onAssignToGroups?: (gameId: string) => void;
}) {
	const [created, setCreated] = useState<ShareableAssignment | null>(null);
	/** "Criar novo" was chosen over the open ones. */
	const [creatingNew, setCreatingNew] = useState(false);

	if (!created && !creatingNew) {
		if (openAssignments === undefined) {
			return null;
		}
		if (openAssignments.length > 0) {
			return (
				<OpenAssignmentsDialog
					open={open}
					onOpenChange={onOpenChange}
					assignments={openAssignments}
					onSelect={setCreated}
					onCreateNew={() => setCreatingNew(true)}
				/>
			);
		}
	}

	if (created) {
		return (
			<ShareAssignmentDialog
				open={open}
				onOpenChange={(next) => {
					if (!next) {
						onDone({ gameId: created.gameId });
						setCreated(null);
						onOpenChange(false);
					}
				}}
				origin={origin}
				assignment={created}
				onAssignToGroups={
					onAssignToGroups && (() => onAssignToGroups(created.gameId))
				}
			/>
		);
	}

	return (
		<AssignDialog
			open={open}
			onOpenChange={onOpenChange}
			setup={setup}
			now={now}
			onCreate={async (input) => {
				const { gameId, pin } = await onCreate(input);
				setCreated({
					gameId,
					pin,
					name: quizTitle,
					deadline: input.deadline.toISOString(),
					// Counted from when the dialog opened, as the card showed it.
					remainingMs: input.deadline.getTime() - now.getTime(),
					participantCount: 0,
				});
			}}
		/>
	);
}
