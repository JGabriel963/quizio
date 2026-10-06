import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { CircleHelpIcon, ClockIcon, UserIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ReportHeaderData, ReportSummaryData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";
import {
	averageTimeLabel,
	DID_NOT_FINISH_HELP,
	DIFFICULT_QUESTIONS_HELP,
	durationLabel,
	NEEDS_HELP_HELP,
	playedQuestionsLabel,
	summaryHeadline,
	unansweredLabel,
} from "@/lib/report-labels";

import { AccuracyRing } from "./accuracy-ring";
import { HelpTip } from "./report-parts";

/** How many participants a card of the summary lists (RN-38, RN-39). */
export const SUMMARY_LIST_SIZE = 5;

const card = "rounded-lg bg-card shadow-sm ring-1 ring-foreground/5";

/** The first tab of a report: how the group went, at a glance (spec 015, RN-35 to RN-39). */
export function ReportSummary({
	header,
	summary,
	playAgain,
}: {
	header: ReportHeaderData;
	summary: ReportSummaryData;
	playAgain: { start: () => void; pending: boolean; error: string | null };
}) {
	const nothingPlayed = summary.accuracyPercent === null;
	const report = { gameId: header.gameId };

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<section
				aria-label="Resultado geral"
				className={`${card} flex flex-col items-center gap-5 p-5 sm:flex-row lg:col-span-2`}
			>
				<AccuracyRing
					percent={summary.accuracyPercent}
					size="lg"
					caption="correto"
				/>
				<div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
					<h2 className="font-black text-2xl">
						{nothingPlayed
							? "A partida acabou antes da primeira revelação"
							: summaryHeadline(summary.accuracyPercent ?? 0)}
					</h2>
					<p className="text-muted-foreground">
						{nothingPlayed
							? "Nenhuma pergunta chegou ao resultado, então não há percentuais para mostrar."
							: "Jogue novamente e deixe o mesmo grupo melhorar a pontuação, ou veja se novos participantes superam esse resultado."}
					</p>
					{header.canPlayAgain && (
						<Button disabled={playAgain.pending} onClick={playAgain.start}>
							Jogar de novo
						</Button>
					)}
					{playAgain.error && (
						<p role="alert" className="font-semibold text-destructive text-sm">
							{playAgain.error}
						</p>
					)}
				</div>
			</section>

			<section aria-label="Totais" className={`${card} p-2`}>
				<dl className="divide-y divide-border">
					<Total icon={<UserIcon />} label="Participantes">
						{header.participantCount}
					</Total>
					<Total icon={<CircleHelpIcon />} label="Perguntas">
						{playedQuestionsLabel(header.playedCount, header.questionCount)}
					</Total>
					<Total icon={<ClockIcon />} label="Tempo">
						{durationLabel(summary.durationMs)}
					</Total>
				</dl>
			</section>

			<SummaryCard
				title={`Perguntas difíceis (${summary.difficultCount})`}
				help={DIFFICULT_QUESTIONS_HELP}
			>
				{summary.hardestQuestion ? (
					<div className="flex flex-col gap-3">
						<Link
							to="/reports/$gameId"
							params={report}
							search={{
								tab: "questions",
								view: "flagged",
								question: summary.hardestQuestion.index,
							}}
							className="flex flex-col overflow-hidden rounded-md ring-1 ring-foreground/10 hover:bg-muted/50"
						>
							<div className="flex gap-3 p-3">
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<span className="text-muted-foreground text-xs">
										{summary.hardestQuestion.index + 1} -{" "}
										{questionTypeLabel(summary.hardestQuestion.type)}
									</span>
									<span className="break-words font-bold">
										{summary.hardestQuestion.text}
									</span>
								</div>
								{summary.hardestQuestion.imageUrl && (
									<img
										src={summary.hardestQuestion.imageUrl}
										alt=""
										className="h-20 w-28 shrink-0 rounded object-cover"
									/>
								)}
							</div>
							<div className="flex flex-wrap items-center justify-around gap-3 bg-muted/60 px-3 py-2 text-sm">
								<span className="inline-flex items-center gap-1">
									<AccuracyRing
										percent={summary.hardestQuestion.accuracyPercent}
									/>
									correto
								</span>
								<span className="inline-flex items-center gap-1.5">
									<ClockIcon aria-hidden="true" className="size-4" />
									Média{" "}
									{averageTimeLabel(
										summary.hardestQuestion.averageResponseTimeMs,
									)}
								</span>
							</div>
						</Link>
						{summary.difficultCount > 1 && (
							<Link
								to="/reports/$gameId"
								params={report}
								search={{ tab: "questions", view: "flagged" }}
								className="self-end font-semibold text-primary text-sm hover:underline"
							>
								Ver tudo ({summary.difficultCount})
							</Link>
						)}
					</div>
				) : (
					<EmptyNote>Nenhuma pergunta foi difícil para o grupo</EmptyNote>
				)}
			</SummaryCard>

			<SummaryCard
				title={
					<Link
						to="/reports/$gameId"
						params={report}
						search={{ tab: "participants", view: "flagged" }}
						className="hover:underline"
					>
						Ajuda necessária ({summary.needsHelp.length})
					</Link>
				}
				help={NEEDS_HELP_HELP}
			>
				{summary.needsHelp.length > 0 ? (
					<ul className="divide-y divide-border">
						{summary.needsHelp
							.slice(0, SUMMARY_LIST_SIZE)
							.map((participant) => (
								<li
									key={participant.playerId}
									className="flex items-center justify-between gap-3 py-2"
								>
									<span className="min-w-0 truncate">
										{participant.nickname}
									</span>
									<AccuracyRing percent={participant.accuracyPercent} />
								</li>
							))}
					</ul>
				) : (
					<EmptyNote>Ninguém precisou de ajuda</EmptyNote>
				)}
			</SummaryCard>

			<SummaryCard
				title={`Não concluiu (${summary.didNotFinish.length})`}
				help={DID_NOT_FINISH_HELP}
			>
				{summary.didNotFinish.length > 0 ? (
					<ul className="divide-y divide-border">
						{summary.didNotFinish
							.slice(0, SUMMARY_LIST_SIZE)
							.map((participant) => (
								<li
									key={participant.playerId}
									className="flex items-center justify-between gap-3 py-2"
								>
									<span className="min-w-0 truncate">
										{participant.nickname}
									</span>
									<span className="shrink-0 text-muted-foreground text-sm">
										{unansweredLabel(participant.unanswered)}
									</span>
								</li>
							))}
					</ul>
				) : (
					<EmptyNote>Excelente! Todos concluíram</EmptyNote>
				)}
			</SummaryCard>
		</div>
	);
}

function Total({
	icon,
	label,
	children,
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 px-3 py-3">
			<span aria-hidden="true" className="text-primary [&>svg]:size-5">
				{icon}
			</span>
			<dt className="flex-1">{label}</dt>
			<dd className="font-bold tabular-nums">{children}</dd>
		</div>
	);
}

function SummaryCard({
	title,
	help,
	children,
}: {
	title: ReactNode;
	help: string;
	children: ReactNode;
}) {
	return (
		<section className={`${card} flex flex-col`}>
			<div className="flex items-center justify-between gap-2 border-border border-b px-4 py-3">
				<h2 className="font-bold">{title}</h2>
				<HelpTip text={help} />
			</div>
			<div className="flex flex-1 flex-col p-4">{children}</div>
		</section>
	);
}

function EmptyNote({ children }: { children: ReactNode }) {
	return (
		<p className="flex flex-1 items-center justify-center py-6 text-center text-muted-foreground">
			{children}
		</p>
	);
}
