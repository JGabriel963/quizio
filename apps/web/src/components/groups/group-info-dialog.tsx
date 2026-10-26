import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";

import type { GroupViewData } from "@/lib/api-types";

import { memberCountLabel } from "./group-grid";

const longDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

/** "Informações do grupo" (spec 034, RN-19). */
export function GroupInfoDialog({
	group,
	onClose,
}: {
	/** Null keeps the dialog closed. */
	group: GroupViewData | null;
	onClose: () => void;
}) {
	return (
		<Dialog
			open={group !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Informações do grupo</DialogTitle>
				</DialogHeader>
				{group && (
					<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
						<dt className="font-semibold">Nome:</dt>
						<dd className="break-words">{group.name}</dd>
						{group.description && (
							<>
								<dt className="font-semibold">Descrição:</dt>
								<dd className="whitespace-pre-line break-words">
									{group.description}
								</dd>
							</>
						)}
						<dt className="font-semibold">Administrador:</dt>
						<dd>{group.adminName}</dd>
						<dt className="font-semibold">Membros:</dt>
						<dd>{memberCountLabel(group.memberCount)}</dd>
						<dt className="font-semibold">Criado em:</dt>
						<dd>{longDate.format(new Date(group.createdAt))}</dd>
					</dl>
				)}
				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
