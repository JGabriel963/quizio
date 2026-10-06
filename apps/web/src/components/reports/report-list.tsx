import type { ReportSection } from "@quizio/core/reports/domain/report";
import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { Skeleton } from "@quizio/ui/components/skeleton";

import type { ReportListItemData } from "@/lib/api-types";

import {
	REPORT_ROW_GRID,
	type ReportItemActions,
	ReportListItem,
} from "./report-list-item";

/**
 * The reports of a section, with a box to select each and one for all of them
 * (spec 015, RN-24, RN-28, RN-29). Which ones are selected is the page's.
 */
export function ReportList({
	items,
	total,
	section,
	selected,
	onSelectedChange,
	actions,
	onShowMore,
	loadingMore = false,
}: {
	items: ReportListItemData[];
	/** How many the section has: more than `items` shows "Mostrar mais". */
	total: number;
	section: ReportSection;
	selected: ReadonlySet<string>;
	onSelectedChange: (selected: ReadonlySet<string>) => void;
	actions: ReportItemActions;
	onShowMore: () => void;
	loadingMore?: boolean;
}) {
	const shown = items.map((item) => item.gameId);
	const allSelected = shown.length > 0 && shown.every((id) => selected.has(id));
	const someSelected = shown.some((id) => selected.has(id));

	return (
		<div className="flex flex-col gap-3">
			<div
				className={`${REPORT_ROW_GRID} px-3 font-bold text-muted-foreground text-xs`}
			>
				<Checkbox
					aria-label="Selecionar todos"
					checked={allSelected}
					indeterminate={someSelected && !allSelected}
					onCheckedChange={(checked) =>
						onSelectedChange(new Set(checked === true ? shown : []))
					}
				/>
				<span className="col-span-2">Título</span>
				<span aria-hidden="true" className="md:order-last md:w-9" />
				<span className="hidden md:block">Participantes</span>
				<span className="hidden md:block">Respostas corretas</span>
				<span className="hidden md:block">Data de término</span>
			</div>

			<ul className="flex flex-col gap-3" aria-label="Relatórios">
				{items.map((item) => (
					<ReportListItem
						key={item.gameId}
						item={item}
						section={section}
						selected={selected.has(item.gameId)}
						onSelectedChange={(checked) => {
							const next = new Set(selected);
							if (checked) {
								next.add(item.gameId);
							} else {
								next.delete(item.gameId);
							}
							onSelectedChange(next);
						}}
						actions={actions}
					/>
				))}
			</ul>

			{items.length < total && (
				<Button
					variant="link"
					className="self-center"
					disabled={loadingMore}
					onClick={onShowMore}
				>
					Mostrar mais
				</Button>
			)}
		</div>
	);
}

/** Placeholder rows shaped like the list while it loads. */
export function ReportListSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<ul
			className="flex flex-col gap-3"
			aria-busy="true"
			aria-label="Carregando relatórios"
		>
			{Array.from({ length: rows }, (_, index) => (
				<li
					key={index}
					className="flex items-center gap-4 rounded-lg bg-card p-3 shadow-sm"
				>
					<Skeleton className="aspect-video w-20 sm:w-28" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-3 w-20" />
					</div>
				</li>
			))}
		</ul>
	);
}

/** The list could not be loaded (RN-56). */
export function ReportListError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-10 text-center">
			<p className="font-semibold">Não foi possível carregar os relatórios.</p>
			<Button variant="outline" onClick={onRetry}>
				Tentar novamente
			</Button>
		</div>
	);
}
