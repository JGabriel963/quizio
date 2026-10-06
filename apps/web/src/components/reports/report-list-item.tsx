import type { ReportSection } from "@quizio/core/reports/domain/report";
import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, UsersIcon } from "lucide-react";

import { QuizCover } from "@/components/quiz/quiz-cover";
import type { ReportListItemData } from "@/lib/api-types";
import { questionCountLabel } from "@/lib/quiz-labels";
import { reportDateLabel } from "@/lib/report-labels";

import { AccuracyRing } from "./accuracy-ring";

export interface ReportItemActions {
	onPlayAgain: (item: ReportListItemData) => void;
	onRename: (item: ReportListItemData) => void;
	onMoveToTrash: (item: ReportListItemData) => void;
	onRestore: (item: ReportListItemData) => void;
	onDeletePermanently: (item: ReportListItemData) => void;
}

/**
 * The columns of the list on a wide screen; the header row uses the same.
 * On a narrow one the numbers go under the name.
 */
export const REPORT_ROW_GRID =
	"grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[auto_auto_minmax(0,1fr)_7rem_10rem_11rem_auto]";

/** One report of the list (spec 015, RN-24 to RN-26). */
export function ReportListItem({
	item,
	section,
	selected,
	onSelectedChange,
	actions,
}: {
	item: ReportListItemData;
	section: ReportSection;
	selected: boolean;
	onSelectedChange: (selected: boolean) => void;
	actions: ReportItemActions;
}) {
	const inTrash = section === "trash";

	return (
		<li
			className={`${REPORT_ROW_GRID} rounded-lg bg-card p-3 shadow-sm`}
			data-selected={selected || undefined}
		>
			<Checkbox
				aria-label={`Selecionar ${item.name}`}
				checked={selected}
				onCheckedChange={(checked) => onSelectedChange(checked === true)}
			/>
			<div className="relative w-20 shrink-0 sm:w-28">
				<QuizCover url={item.coverUrl} />
				<span className="absolute bottom-1 left-1 whitespace-nowrap rounded bg-black/70 px-1 py-0.5 font-semibold text-[0.6rem] text-white sm:px-1.5 sm:text-[0.65rem]">
					{questionCountLabel(item.questionCount)}
				</span>
			</div>
			<div className="flex min-w-0 flex-col gap-1">
				{inTrash ? (
					// A report in the trash does not open (RN-51).
					<span className="truncate font-bold">{item.name}</span>
				) : (
					<Link
						to="/reports/$gameId"
						params={{ gameId: item.gameId }}
						className="truncate font-bold hover:underline"
					>
						{item.name}
					</Link>
				)}
				<span className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
					Ao vivo
					{item.endedEarly && (
						<Badge variant="private">Encerrada antes do fim</Badge>
					)}
				</span>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							className="md:order-last"
							aria-label={`Ações para ${item.name}`}
						/>
					}
				>
					<EllipsisVerticalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{inTrash ? (
						<>
							<DropdownMenuItem onClick={() => actions.onRestore(item)}>
								Restaurar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onDeletePermanently(item)}
							>
								Excluir definitivamente
							</DropdownMenuItem>
						</>
					) : (
						<>
							<DropdownMenuItem
								render={
									<Link
										to="/reports/$gameId"
										params={{ gameId: item.gameId }}
									/>
								}
							>
								Abrir relatório
							</DropdownMenuItem>
							{item.canPlayAgain && (
								<DropdownMenuItem onClick={() => actions.onPlayAgain(item)}>
									Jogar de novo
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={() => actions.onRename(item)}>
								Renomear
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => actions.onMoveToTrash(item)}
							>
								Mover para a lixeira
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{/* One row of numbers under the name on a phone; on a wide screen its
			    children are the columns themselves. */}
			<div className="col-span-full flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:contents">
				<span className="inline-flex items-center gap-1.5 tabular-nums">
					<UsersIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
					<span className="sr-only">Participantes:</span>
					{item.participantCount}
				</span>
				<span className="inline-flex items-center">
					<span className="sr-only">Respostas corretas:</span>
					<AccuracyRing percent={item.accuracyPercent} />
				</span>
				<span className="text-muted-foreground text-xs">
					<span className="sr-only">Terminou em</span>{" "}
					{reportDateLabel(item.endedAt)}
				</span>
			</div>
		</li>
	);
}
