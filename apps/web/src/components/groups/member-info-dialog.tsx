import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { UserAvatar } from "@/components/account/user-avatar";
import type { GroupMemberData } from "@/lib/api-types";
import { MEMBER_STATUS_LABEL } from "./members-table";

const ROLE_LABELS = { admin: "Administrador", member: "Membro" } as const;

/**
 * "Informações do membro" (spec 034, RN-34): the email only comes to the
 * admin, so its line shows only when it is there.
 */
export function MemberInfoDialog({
	member,
	onClose,
}: {
	/** Null keeps the dialog closed. */
	member: GroupMemberData | null;
	onClose: () => void;
}) {
	return (
		<Dialog
			open={member !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Informações do membro</DialogTitle>
				</DialogHeader>
				{member && (
					<div className="grid gap-4">
						<UserAvatar
							userId={member.userId}
							photoUrl={member.photoUrl}
							size="lg"
						/>
						<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
							<dt className="font-semibold">Nome:</dt>
							<dd className="break-words">{member.name}</dd>
							{member.email && (
								<>
									<dt className="font-semibold">E-mail:</dt>
									<dd className="break-all">{member.email}</dd>
								</>
							)}
							<dt className="font-semibold">Função:</dt>
							<dd>{ROLE_LABELS[member.role]}</dd>
							<dt className="font-semibold">Status:</dt>
							<dd>{MEMBER_STATUS_LABEL}</dd>
						</dl>
					</div>
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
