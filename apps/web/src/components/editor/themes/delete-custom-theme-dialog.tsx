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
 * Asks before deleting a custom theme (spec 043, RN-19): the quizzes using it
 * go back to the standard theme; games keep theirs. `theme` is null while
 * nothing is being deleted.
 */
export function DeleteCustomThemeDialog({
	theme,
	onCancel,
	onConfirm,
}: {
	theme: { name: string; quizCount: number } | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog
			open={theme !== null}
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{`Excluir o tema ${theme?.name ?? ""}?`}</AlertDialogTitle>
					<AlertDialogDescription>
						{usageOf(theme?.quizCount ?? 0)}
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

function usageOf(quizCount: number): string {
	if (quizCount === 0) {
		return "Essa ação não pode ser desfeita.";
	}
	return quizCount === 1
		? "1 quiz usa este tema e voltará para o tema Padrão."
		: `${quizCount} quizzes usam este tema e voltarão para o tema Padrão.`;
}
