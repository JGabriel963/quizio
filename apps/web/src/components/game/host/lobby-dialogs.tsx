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

import type { LobbyPlayerData } from "@/lib/api-types";

/** "Remover ACT?" (spec 008, RN-28). */
export function RemovePlayerDialog({
	player,
	onCancel,
	onConfirm,
}: {
	/** The player being removed; null keeps the dialog closed. */
	player: LobbyPlayerData | null;
	onCancel: () => void;
	onConfirm: (player: LobbyPlayerData) => void;
}) {
	return (
		<AlertDialog
			open={player !== null}
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Remover {player?.nickname}?</AlertDialogTitle>
					<AlertDialogDescription>
						Este participante será removido, mas poderá voltar usando outro
						apelido.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							if (player) {
								onConfirm(player);
							}
						}}
					>
						Remover
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** "Encerrar o jogo?" (spec 008, RN-31). */
export function EndGameDialog({
	open,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Encerrar o jogo?</AlertDialogTitle>
					<AlertDialogDescription>
						Os participantes serão desconectados e o PIN deixará de funcionar.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Encerrar
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
