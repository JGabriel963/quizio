import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";

/**
 * Explicit confirmation before reports are deleted for good, one or several
 * at once (spec 015, RN-53).
 */
export function DeleteReportDialog({
	names,
	onCancel,
	onConfirm,
}: {
	/** The reports to delete; null keeps the dialog closed. */
	names: readonly string[] | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const [first] = names ?? [];
	const several = (names?.length ?? 0) > 1;

	return (
		<AlertDialog
			open={names !== null && names.length > 0}
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{several
							? `Excluir ${names?.length} relatórios definitivamente?`
							: `Excluir “${first}” definitivamente?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{several
							? "As partidas e as respostas delas serão apagadas."
							: "A partida e as respostas dela serão apagadas."}{" "}
						O quiz não é afetado. Esta ação não pode ser desfeita.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Excluir definitivamente
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
