import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { LinkIcon, UsersIcon } from "lucide-react";

import type { GroupInvitationData } from "@/lib/api-types";

const card =
	"flex w-full max-w-lg flex-col gap-6 rounded-lg bg-card p-6 shadow-md sm:p-8";

/**
 * The invite link's screen (spec 034, RN-25, RN-28): waiting for an answer,
 * or no longer valid. A member never sees it: the route sends them in.
 */
export function InviteCard({
	invitation,
	accepting,
	onAccept,
}: {
	invitation: Exclude<GroupInvitationData, { status: "member" }>;
	accepting: boolean;
	onAccept: () => void;
}) {
	if (invitation.status === "invalid") {
		return (
			<div className={card}>
				<h1 className="font-bold text-2xl">Este convite não é mais válido</h1>
				<div className="flex justify-center">
					<span className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
						<LinkIcon aria-hidden="true" className="size-9" />
					</span>
				</div>
				<p className="text-center text-sm">
					Peça um novo link a quem administra o grupo.
				</p>
				<div className="flex justify-center">
					<Button nativeButton={false} render={<Link to="/" />}>
						Ir para o início
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={card}>
			<h1 className="font-bold text-2xl">
				O convite para entrar no grupo aguarda sua resposta
			</h1>
			<div className="flex flex-col items-center gap-3">
				<span className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
					<UsersIcon aria-hidden="true" className="size-11" />
				</span>
				<p className="break-words font-bold text-lg uppercase">
					{invitation.name}
				</p>
			</div>
			<p className="text-center text-sm">
				Aceite o convite e faça parte do grupo agora.
			</p>
			<div className="flex justify-center gap-3">
				<Button
					variant="secondary"
					nativeButton={false}
					render={<Link to="/" />}
				>
					Cancelar
				</Button>
				<Button variant="success" disabled={accepting} onClick={onAccept}>
					Aceitar convite
				</Button>
			</div>
		</div>
	);
}
