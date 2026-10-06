import { Button } from "@quizio/ui/components/button";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { ReportParticipantData } from "@/lib/api-types";

import { AccuracyRing } from "./accuracy-ring";
import {
	pointsLabel,
	REPORT_TABLE_PAGE,
	type ReportView,
} from "./report-parts";

const ROW_GRID =
	"grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_7rem_10rem_8rem_9rem]";

/**
 * The participants of a game: everybody by their place, or who needs help
 * from the lowest accuracy (spec 015, RN-40, RN-41). A nickname opens what
 * that participant answered.
 */
export function ParticipantsTable({
	gameId,
	participants,
	view,
}: {
	gameId: string;
	/** By rank, as the report gives them. */
	participants: ReportParticipantData[];
	view: ReportView;
}) {
	const [showAll, setShowAll] = useState(false);
	const flagged = participants
		.filter((participant) => participant.needsHelp)
		.sort(
			(a, b) =>
				(a.accuracyPercent ?? 0) - (b.accuracyPercent ?? 0) || a.rank - b.rank,
		);
	const rows = view === "flagged" ? flagged : participants;
	const shown = showAll ? rows : rows.slice(0, REPORT_TABLE_PAGE);

	return (
		<section className="flex flex-col rounded-lg bg-card shadow-sm ring-1 ring-foreground/5">
			<div className="border-border border-b p-2">
				<TabNav aria-label="Participantes a listar">
					{(
						[
							["all", `Todos (${participants.length})`],
							["flagged", `Ajuda necessária (${flagged.length})`],
						] as const
					).map(([target, label]) => (
						<TabNavItem
							key={target}
							current={target === view}
							render={
								<Link
									to="/reports/$gameId"
									params={{ gameId }}
									search={{ tab: "participants", view: target }}
								/>
							}
						>
							{label}
						</TabNavItem>
					))}
				</TabNav>
			</div>

			<div
				aria-hidden="true"
				className={`${ROW_GRID} hidden bg-muted/60 font-bold text-sm md:grid`}
			>
				<span>Apelido</span>
				<span className="text-center">Classificação</span>
				<span>Respostas corretas</span>
				<span className="text-center">Não respondido</span>
				<span className="text-right">Pontuação final</span>
			</div>

			{rows.length === 0 ? (
				<p className="px-4 py-10 text-center text-muted-foreground">
					{view === "flagged"
						? "Ninguém precisou de ajuda"
						: "Nenhum participante"}
				</p>
			) : (
				<ul aria-label="Participantes" className="divide-y divide-border">
					{shown.map((participant) => (
						<li key={participant.playerId} className={ROW_GRID}>
							<Link
								to="/reports/$gameId"
								params={{ gameId }}
								search={{
									tab: "participants",
									view,
									participant: participant.playerId,
								}}
								className="min-w-0 truncate font-semibold hover:underline"
							>
								{participant.nickname}
							</Link>
							<span className="text-right tabular-nums md:text-center">
								<span className="text-muted-foreground text-xs md:sr-only">
									Classificação{" "}
								</span>
								{participant.rank}
							</span>
							<span className="inline-flex items-center">
								<span className="sr-only">Respostas corretas:</span>
								<AccuracyRing percent={participant.accuracyPercent} />
							</span>
							<span className="text-right tabular-nums md:text-center">
								<span className="text-muted-foreground text-xs md:sr-only">
									Não respondido{" "}
								</span>
								{participant.unanswered === 0 ? "—" : participant.unanswered}
							</span>
							<span className="col-span-full text-sm tabular-nums md:col-span-1 md:text-right md:text-base">
								<span className="text-muted-foreground text-xs md:sr-only">
									Pontuação final{" "}
								</span>
								{pointsLabel(participant.total)}
							</span>
						</li>
					))}
				</ul>
			)}

			{shown.length < rows.length && (
				<Button
					variant="link"
					className="self-center py-4"
					onClick={() => setShowAll(true)}
				>
					Mostrar mais
				</Button>
			)}
		</section>
	);
}
