import { REPORT_SECTIONS } from "@quizio/core/reports/domain/report";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { LibrarySearch } from "@/components/library/library-search";
import { DeleteReportDialog } from "@/components/reports/delete-report-dialog";
import { RenameReportDialog } from "@/components/reports/rename-report-dialog";
import { ReportEmptyState } from "@/components/reports/report-empty-state";
import {
	ReportList,
	ReportListError,
	ReportListSkeleton,
} from "@/components/reports/report-list";
import type { ReportItemActions } from "@/components/reports/report-list-item";
import { ReportSelectionBar } from "@/components/reports/report-selection-bar";
import {
	REPORT_SECTION_LABELS,
	ReportTabs,
} from "@/components/reports/report-tabs";
import type { ReportListItemData } from "@/lib/api-types";
import { usePlayAgain } from "@/lib/game-mutations";
import { useReportMutations } from "@/lib/report-mutations";
import { useTRPC } from "@/utils/trpc";

/** How many reports each "Mostrar mais" brings (spec 015, RN-28). */
const REPORTS_PAGE = 20;

const reportsSearchSchema = z.object({
	section: z.enum(REPORT_SECTIONS).catch("reports").default("reports"),
	q: z.string().optional(),
});

export const Route = createFileRoute("/_auth/_shell/reports/")({
	validateSearch: reportsSearchSchema,
	component: ReportsPage,
});

function ReportsPage() {
	const { section, q = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useReportMutations();
	const playAgain = usePlayAgain();
	const [limit, setLimit] = useState(REPORTS_PAGE);
	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
	const [renaming, setRenaming] = useState<ReportListItemData | null>(null);
	const [deleting, setDeleting] = useState<ReportListItemData[] | null>(null);
	const reports = useQuery({
		...trpc.report.list.queryOptions({
			section,
			search: q || undefined,
			limit,
		}),
		// The list stays on the screen while a longer one arrives.
		placeholderData: keepPreviousData,
	});

	// Another section or another search is another list.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on change
	useEffect(() => {
		setLimit(REPORTS_PAGE);
		setSelected(new Set());
	}, [section, q]);

	const items = reports.data?.items ?? [];
	// Only what is still listed counts as selected.
	const selectedItems = items.filter((item) => selected.has(item.gameId));
	const selectedIds = selectedItems.map((item) => item.gameId);
	const clearSelection = () => setSelected(new Set());

	const actions: ReportItemActions = {
		onPlayAgain: (item) => {
			if (item.quizId) {
				playAgain.start(item.quizId);
			}
		},
		onRename: setRenaming,
		onMoveToTrash: (item) =>
			mutations.moveToTrash.mutate({ gameIds: [item.gameId] }),
		onRestore: (item) => mutations.restore.mutate({ gameIds: [item.gameId] }),
		onDeletePermanently: (item) => setDeleting([item]),
	};

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			<div>
				<ReportTabs active={section} />
			</div>

			<section className="flex min-w-0 flex-col gap-4">
				<h1 className="font-bold text-2xl">{REPORT_SECTION_LABELS[section]}</h1>

				<LibrarySearch
					label="Pesquisar relatórios"
					value={q}
					onSearch={(value) =>
						navigate({
							search: { section, q: value.trim() || undefined },
							replace: true,
						})
					}
				/>

				{playAgain.error && (
					<p role="alert" className="font-semibold text-destructive text-sm">
						{playAgain.error}
					</p>
				)}

				<ReportSelectionBar
					count={selectedIds.length}
					section={section}
					onMoveToTrash={() => {
						mutations.moveToTrash.mutate({ gameIds: selectedIds });
						clearSelection();
					}}
					onRestore={() => {
						mutations.restore.mutate({ gameIds: selectedIds });
						clearSelection();
					}}
					onDeletePermanently={() => setDeleting(selectedItems)}
					onClear={clearSelection}
				/>

				{reports.isPending ? (
					<ReportListSkeleton />
				) : reports.isError ? (
					<ReportListError onRetry={() => reports.refetch()} />
				) : items.length === 0 ? (
					q ? (
						<ReportEmptyState kind="search" search={q} />
					) : (
						<ReportEmptyState kind={section} />
					)
				) : (
					<ReportList
						items={items}
						total={reports.data.total}
						section={section}
						selected={selected}
						onSelectedChange={setSelected}
						actions={actions}
						onShowMore={() => setLimit((current) => current + REPORTS_PAGE)}
						loadingMore={reports.isPlaceholderData}
					/>
				)}
			</section>

			<RenameReportDialog
				report={renaming}
				onClose={() => setRenaming(null)}
				onRename={(name) =>
					renaming
						? mutations.rename.mutateAsync({ gameId: renaming.gameId, name })
						: Promise.resolve()
				}
			/>
			<DeleteReportDialog
				names={deleting?.map((item) => item.name) ?? null}
				onCancel={() => setDeleting(null)}
				onConfirm={() => {
					if (deleting) {
						mutations.deletePermanently.mutate({
							gameIds: deleting.map((item) => item.gameId),
						});
					}
					setDeleting(null);
					clearSelection();
				}}
			/>
		</div>
	);
}
