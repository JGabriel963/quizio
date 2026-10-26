import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

const panel =
	"flex flex-col items-center gap-4 rounded-lg bg-card px-6 py-12 text-center shadow-sm";

/** Missing, or a group the user is not in: both look the same (spec 034, RN-05). */
export function GroupNotFound() {
	return (
		<div className={panel}>
			<h1 className="font-bold text-xl">Grupo não encontrado</h1>
			<p className="text-muted-foreground">
				Ele pode ter sido excluído, você pode não fazer mais parte dele, ou o
				endereço não está certo.
			</p>
			<Button
				variant="outline"
				nativeButton={false}
				render={<Link to="/groups" search={{ section: "managed" }} />}
			>
				Ver os grupos
			</Button>
		</div>
	);
}

export function GroupLoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className={panel}>
			<p className="font-semibold">Não foi possível carregar o grupo.</p>
			<Button variant="outline" onClick={onRetry}>
				Tentar novamente
			</Button>
		</div>
	);
}

export function GroupSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-busy="true">
			<Skeleton className="h-9 w-64" />
			<Skeleton className="h-10 w-full max-w-md" />
			<Skeleton className="h-40 w-full rounded-lg" />
		</div>
	);
}

function BackToGroup({ groupId }: { groupId: string }) {
	return (
		<Button
			variant="outline"
			nativeButton={false}
			render={<Link to="/groups/$groupId" params={{ groupId }} />}
		>
			Voltar para o grupo
		</Button>
	);
}

/** A member at the settings' address (spec 035, RN-02). */
export function GroupAdminOnly({ groupId }: { groupId: string }) {
	return (
		<div className={panel}>
			<p className="font-semibold">
				Só o administrador do grupo pode mudar as configurações.
			</p>
			<BackToGroup groupId={groupId} />
		</div>
	);
}

/** A member at the members' address with the list hidden (spec 035, RN-13). */
export function MembersHidden({ groupId }: { groupId: string }) {
	return (
		<div className={panel}>
			<p className="font-semibold">
				O administrador ocultou a lista de membros.
			</p>
			<BackToGroup groupId={groupId} />
		</div>
	);
}
