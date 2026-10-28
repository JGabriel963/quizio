import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import { useState } from "react";

/**
 * Desconectar and Revogar ask first (spec 044, RN-14, RN-15). A failure keeps
 * the dialog open and says so; the row stays until the server answers.
 */
export function ConfirmDialog({
	open,
	title,
	description,
	action,
	failure,
	onConfirm,
	onClose,
}: {
	open: boolean;
	title: string;
	description: string;
	action: string;
	failure: string;
	onConfirm: () => Promise<void>;
	onClose: () => void;
}) {
	const [failed, setFailed] = useState(false);
	const [busy, setBusy] = useState(false);

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setFailed(false);
					onClose();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{failed && (
					<p role="alert" className="text-destructive text-sm">
						{failure}
					</p>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
					<Button
						type="button"
						variant="destructive"
						disabled={busy}
						onClick={async () => {
							setBusy(true);
							setFailed(false);
							try {
								await onConfirm();
								onClose();
							} catch {
								setFailed(true);
							} finally {
								setBusy(false);
							}
						}}
					>
						{action}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
