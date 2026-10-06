import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

import { AccuracyRing } from "@/components/reports/accuracy-ring";
import type { ReportListData } from "@/lib/api-types";
import { reportDateLabel } from "@/lib/report-labels";

export type RecentReportsState =
	| { status: "pending" }
	| { status: "error" }
	| { status: "ready"; reports: ReportListData };

/**
 * "Relatórios mais recentes": the newest reports and the way into all of
 * them (spec 015, RN-31; it was "Em breve" since spec 002).
 */
export function RecentReportsCard({
	state,
	onRetry,
}: {
	state: RecentReportsState;
	onRetry: () => void;
}) {
	return (
		<section
			aria-labelledby="recent-reports-title"
			className="flex flex-col gap-3 rounded-md bg-card p-4 ring-1 ring-foreground/10"
		>
			<div className="flex items-center justify-between gap-3">
				<h2 id="recent-reports-title" className="font-bold text-lg">
					Relatórios mais recentes
				</h2>
				{state.status === "ready" && state.reports.total > 0 ? (
					<Link
						to="/reports"
						search={{ section: "reports" }}
						className="font-semibold text-primary text-sm hover:underline"
					>
						Ver tudo ({state.reports.total})
					</Link>
				) : null}
			</div>

			<CardBody state={state} onRetry={onRetry} />
		</section>
	);
}

function CardBody({
	state,
	onRetry,
}: {
	state: RecentReportsState;
	onRetry: () => void;
}) {
	if (state.status === "pending") {
		return (
			<div
				role="status"
				aria-label="Carregando os relatórios"
				className="flex flex-col gap-2"
			>
				{[0, 1, 2].map((row) => (
					<div key={row} className="flex items-center gap-3 p-2">
						<div className="flex flex-1 flex-col gap-2">
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="h-3 w-1/4" />
						</div>
						<Skeleton className="h-6 w-16" />
					</div>
				))}
			</div>
		);
	}

	if (state.status === "error") {
		return (
			<div className="flex flex-col items-center gap-3 py-8 text-center">
				<p className="font-semibold text-sm">
					Não foi possível carregar os relatórios.
				</p>
				<Button variant="outline" onClick={onRetry}>
					Tentar novamente
				</Button>
			</div>
		);
	}

	if (state.reports.items.length === 0) {
		return (
			<div className="flex flex-col items-center gap-1 py-8 text-center">
				<p className="font-semibold">Você ainda não tem relatórios.</p>
				<p className="text-muted-foreground text-sm">
					Eles aparecem aqui depois de cada partida ao vivo que você organizar.
				</p>
			</div>
		);
	}

	return (
		<ul aria-label="Relatórios mais recentes" className="flex flex-col">
			{state.reports.items.map((report) => (
				<li
					key={report.gameId}
					className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
				>
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<Link
							to="/reports/$gameId"
							params={{ gameId: report.gameId }}
							className="truncate font-bold text-sm hover:underline"
						>
							{report.name}
						</Link>
						<span className="text-muted-foreground text-xs">
							{reportDateLabel(report.endedAt)}
						</span>
					</div>
					<span className="inline-flex items-center">
						<span className="sr-only">Respostas corretas:</span>
						<AccuracyRing percent={report.accuracyPercent} />
					</span>
				</li>
			))}
		</ul>
	);
}
