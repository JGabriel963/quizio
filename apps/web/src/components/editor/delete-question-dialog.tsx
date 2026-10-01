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
 * Asks before deleting a question, as Kahoot does (spec 003, RN-14). `position`
 * is the question's number in the list, or null while nothing is being deleted.
 */
export function DeleteQuestionDialog({
	position,
	onCancel,
	onConfirm,
}: {
	position: number | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog
			open={position !== null}
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Excluir pergunta</AlertDialogTitle>
					<AlertDialogDescription>
						{`Tem certeza de que quer excluir a pergunta ${position ?? ""}? Essa ação não pode ser desfeita.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Excluir
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
