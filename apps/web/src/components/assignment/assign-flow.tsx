import { useState } from "react";

import {
	AssignDialog,
	type AssignmentOptionsData,
	type AssignmentSetupData,
} from "./assign-dialog";
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
	onCreate,
	onDone,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The activity's name: the quiz's title now (RN-28). */
	quizTitle: string;
	setup: AssignmentSetupData | undefined;
	now: Date;
	origin: string;
	onCreate: (input: {
		deadline: Date;
		options: AssignmentOptionsData;
	}) => Promise<{ gameId: string; pin: string }>;
	onDone: (assignment: { gameId: string }) => void;
}) {
	const [created, setCreated] = useState<ShareableAssignment | null>(null);

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
