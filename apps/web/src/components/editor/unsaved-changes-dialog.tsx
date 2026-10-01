import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";

/**
 * Asked when leaving a published quiz whose questions differ from its playable
 * version, as Kahoot does (spec 006, RN-24 a RN-26).
 */
export function UnsavedChangesDialog({
	open,
	busy = false,
	onDiscard,
	onLeave,
	onBack,
}: {
	open: boolean;
	/** A discard or the exit is on its way: the actions wait. */
	busy?: boolean;
	/** "Descartar": the questions go back to the playable version. */
	onDiscard: () => void;
	/** "Deixar sem salvar": leaves with the changes kept. */
	onLeave: () => void;
	onBack: () => void;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !busy) {
					onBack();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">
						Algumas alterações não foram salvas
					</DialogTitle>
					<DialogDescription className="text-base text-foreground">
						Se você descartar as alterações, elas serão perdidas.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4">
					<div className="flex flex-wrap justify-center gap-2">
						<Button variant="destructive" disabled={busy} onClick={onDiscard}>
							Descartar
						</Button>
						<Button variant="success" disabled={busy} onClick={onLeave}>
							Deixar sem salvar
						</Button>
					</div>
					<Button variant="ghost" disabled={busy} onClick={onBack}>
						Voltar para edição
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
