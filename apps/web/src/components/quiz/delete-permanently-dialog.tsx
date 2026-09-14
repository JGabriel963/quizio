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

/** Explicit confirmation before an irreversible deletion (spec 001, RN-24). */
export function DeletePermanentlyDialog({
	quizTitle,
	open,
	onOpenChange,
	onConfirm,
}: {
	quizTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
}) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => onOpenChange(nextOpen)}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Excluir “{quizTitle}” definitivamente?
					</AlertDialogTitle>
					<AlertDialogDescription>
						O quiz e a capa serão apagados. Esta ação não pode ser desfeita.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={() => onConfirm()}>
						Excluir definitivamente
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
