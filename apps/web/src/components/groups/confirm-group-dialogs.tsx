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
import type { ReactNode } from "react";

interface ConfirmProps {
	/** Who or which group; null keeps the dialog closed. */
	name: string | null;
	onCancel: () => void;
	onConfirm: () => void;
}

function Confirm({
	name,
	onCancel,
	onConfirm,
	title,
	description,
	action,
}: ConfirmProps & {
	title: string;
	description: ReactNode;
	action: string;
}) {
	return (
		<AlertDialog
			open={name !== null}
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						{action}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** Removing is not banning: the link still works until reset (spec 034, RN-35). */
export function RemoveMemberDialog(props: ConfirmProps) {
	return (
		<Confirm
			{...props}
			title={`Remover ${props.name} do grupo?`}
			description={`${props.name} deixa de ver o grupo. Para impedir que volte pelo link, redefina o link de convite.`}
			action="Remover"
		/>
	);
}

/** Members only (spec 034, RN-36). */
export function LeaveGroupDialog(props: ConfirmProps) {
	return (
		<Confirm
			{...props}
			title={`Sair de ${props.name}?`}
			description="Você deixa de ver o grupo. Para voltar, vai precisar do link de convite."
			action="Sair"
		/>
	);
}

/** For good and for everybody (spec 034, RN-37). */
export function DeleteGroupDialog(props: ConfirmProps) {
	return (
		<Confirm
			{...props}
			title={`Excluir ${props.name}?`}
			description="O grupo é excluído para todos os membros e o link de convite deixa de funcionar. Esta ação não pode ser desfeita."
			action="Excluir"
		/>
	);
}
