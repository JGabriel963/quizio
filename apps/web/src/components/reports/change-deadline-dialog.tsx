import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { useState } from "react";

import { DeadlinePicker } from "@/components/assignment/deadline-picker";
import { deadlineBounds } from "@/lib/assignment-deadline";
import { assignmentErrorMessage } from "@/lib/assignment-error-messages";

/**
 * "Alterar o prazo" (spec 029, RN-36 to RN-38, RN-43): earlier or later, within
 * the bounds counted from now. A failure keeps the deadline and says so.
 */
export function ChangeDeadlineDialog({
	open,
	onOpenChange,
	deadline,
	now,
	maxDays,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	deadline: Date;
	/** When the dialog opened. */
	now: Date;
	maxDays: number;
	onSave: (deadline: Date) => Promise<void>;
}) {
	const [failure, setFailure] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function save(next: Date) {
		setSaving(true);
		setFailure(null);
		try {
			await onSave(next);
			onOpenChange(false);
		} catch (error) {
			setFailure(
				assignmentErrorMessage(
					error,
					"Não foi possível alterar o prazo. Tente novamente.",
					maxDays,
				),
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Alterar o prazo</DialogTitle>
					<DialogDescription>
						Os participantes devem completar o quiz atribuído até:
					</DialogDescription>
				</DialogHeader>
				<DeadlinePicker
					value={deadline}
					bounds={deadlineBounds(now, maxDays)}
					applyLabel={saving ? "Salvando…" : "Salvar"}
					onApply={(next) => {
						if (!saving) {
							void save(next);
						}
					}}
					onCancel={() => onOpenChange(false)}
				/>
				{failure && (
					<p role="alert" className="font-semibold text-destructive text-sm">
						{failure}
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
