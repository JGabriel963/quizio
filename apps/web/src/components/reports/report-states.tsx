import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

const panel =
	"flex flex-col items-center gap-4 rounded-lg bg-card px-6 py-12 text-center shadow-sm";

function BackToReports() {
	return (
		<Button
			variant="outline"
			nativeButton={false}
			render={<Link to="/reports" search={{ section: "reports" }} />}
		>
			Ver os relatórios
		</Button>
	);
}

/** A report in the trash does not open: it is restored first (spec 015, RN-51). */
export function ReportTrashed({
	onRestore,
	restoring = false,
}: {
	onRestore: () => void;
	restoring?: boolean;
}) {
	return (
		<div className={panel}>
			<Trash2Icon
				aria-hidden="true"
				className="size-10 text-muted-foreground"
			/>
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-xl">Este relatório está na lixeira</h1>
				<p className="text-muted-foreground">
					Restaure-o para ver os resultados da partida.
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-2">
				<Button disabled={restoring} onClick={onRestore}>
					Restaurar
				</Button>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link to="/reports" search={{ section: "trash" }} />}
				>
					Abrir a lixeira
				</Button>
			</div>
		</div>
	);
}

/** Missing, or somebody else's: both look the same (RN-03). */
export function ReportNotFound() {
	return (
		<div className={panel}>
			<h1 className="font-bold text-xl">Relatório não encontrado</h1>
			<p className="text-muted-foreground">
				Ele pode ter sido excluído, ou o endereço não está certo.
			</p>
			<BackToReports />
		</div>
	);
}

export function ReportLoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className={panel}>
			<p className="font-semibold">Não foi possível carregar o relatório.</p>
			<Button variant="outline" onClick={onRetry}>
				Tentar novamente
			</Button>
		</div>
	);
}

export function ReportSkeleton() {
	return (
		<div
			role="status"
			aria-label="Carregando o relatório"
			className="flex flex-col gap-6"
		>
			<div className="flex flex-col gap-3">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-9 w-2/3" />
				<Skeleton className="h-10 w-80 max-w-full" />
			</div>
			<div className="grid gap-4 lg:grid-cols-3">
				<Skeleton className="h-48 lg:col-span-2" />
				<Skeleton className="h-48" />
				<Skeleton className="h-56" />
				<Skeleton className="h-56" />
				<Skeleton className="h-56" />
			</div>
		</div>
	);
}

/** A detail that is loading, or that could not be loaded, inside its panel. */
export function DetailState({
	state,
	onRetry,
	children,
}: {
	state: "pending" | "error" | "ready";
	onRetry: () => void;
	children: ReactNode;
}) {
	if (state === "pending") {
		return (
			<div
				role="status"
				aria-label="Carregando"
				className="flex flex-col gap-3"
			>
				<Skeleton className="h-16" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</div>
		);
	}
	if (state === "error") {
		return (
			<div className="flex flex-col items-center gap-3 py-10 text-center">
				<p className="font-semibold">Não foi possível carregar.</p>
				<Button variant="outline" onClick={onRetry}>
					Tentar novamente
				</Button>
			</div>
		);
	}
	return children;
}
