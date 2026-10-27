import { Button } from "@quizio/ui/components/button";
import { useEffect, useState } from "react";

import { SelectQuizDialog } from "@/components/groups/assign/select-quiz-dialog";
import type { LibraryItemView } from "@/lib/api-types";
import { groupErrorMessage } from "@/lib/group-error-messages";
import {
	shareButtonLabel,
	toggleSharedSelection,
} from "@/lib/share-quizzes-state";

/**
 * The Compart. of the box and of the tab (spec 037, RN-05 to RN-07):
 * "Selecionar kahoot" with several quizzes marked, shared at once. A refusal
 * keeps the dialog open with its reason.
 */
export function ShareQuizzesDialog({
	open,
	quizzes,
	ownerName,
	sharedIds,
	onShare,
	onClose,
}: {
	open: boolean;
	quizzes: readonly LibraryItemView[] | undefined;
	ownerName: string;
	sharedIds: readonly string[];
	onShare: (quizIds: readonly string[]) => Promise<unknown>;
	onClose: () => void;
}) {
	const [selected, setSelected] = useState<readonly string[]>([]);
	const [sharing, setSharing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setSelected([]);
			setSharing(false);
			setError(null);
		}
	}, [open]);

	async function share() {
		if (selected.length === 0 || sharing) {
			return;
		}
		setSharing(true);
		setError(null);
		try {
			await onShare(selected);
			onClose();
		} catch (failure) {
			setError(
				groupErrorMessage(
					failure,
					"Não foi possível compartilhar. Tente novamente.",
				),
			);
			setSharing(false);
		}
	}

	const alreadyShared = new Set(sharedIds);

	return (
		<SelectQuizDialog
			open={open}
			quizzes={quizzes}
			ownerName={ownerName}
			purpose="share"
			sharedIds={sharedIds}
			selection={{
				selected,
				onToggle: (quizId) => {
					setError(null);
					setSelected((current) =>
						toggleSharedSelection(current, quizId, alreadyShared),
					);
				},
				action: (
					<>
						{error && (
							<p role="alert" className="self-center text-destructive text-sm">
								{error}
							</p>
						)}
						<Button
							disabled={selected.length === 0 || sharing}
							aria-busy={sharing || undefined}
							onClick={() => void share()}
						>
							{shareButtonLabel(selected.length)}
						</Button>
					</>
				),
			}}
			onClose={onClose}
		/>
	);
}
