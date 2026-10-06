import { CheckIcon, ClockIcon } from "lucide-react";

import type { QuestionDetailData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { averageTimeLabel, responseTimeLabel } from "@/lib/report-labels";

import { AccuracyRing } from "./accuracy-ring";
import { ChoiceChip, pointsLabel, ResultBadge } from "./report-parts";

/**
 * How the group answered one question: each answer as the game showed it,
 * with how many chose it, and what every participant did (spec 015, RN-44).
 */
export function QuestionDetail({ detail }: { detail: QuestionDetailData }) {
	const answered = detail.participants.length - detail.unanswered;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs">
					{detail.index + 1} - {questionTypeLabel(detail.type)}
				</span>
				<p className="break-words font-bold text-lg">{detail.text}</p>
				{detail.imageUrl && (
					<img
						src={detail.imageUrl}
						alt=""
						className="max-h-56 w-full rounded-md object-contain"
					/>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-muted/60 p-3 text-sm">
				<span className="inline-flex items-center gap-1">
					<AccuracyRing percent={detail.accuracyPercent} />
					correto
				</span>
				<span className="inline-flex items-center gap-1.5">
					<ClockIcon aria-hidden="true" className="size-4" />
					Média {averageTimeLabel(detail.averageResponseTimeMs)}
				</span>
				<span>
					{detail.unanswered === 1
						? "1 não respondeu"
						: `${detail.unanswered} não responderam`}
				</span>
			</div>

			<section className="flex flex-col gap-2">
				<h3 className="font-bold">Respostas</h3>
				<ul aria-label="Alternativas" className="flex flex-col gap-2">
					{detail.choices.map((choice) => (
						<li
							key={choice.id}
							className="flex flex-col gap-1 rounded-md p-3 ring-1 ring-foreground/10"
						>
							<div className="flex items-center gap-3">
								<ChoiceChip
									shapeIndex={choice.shapeIndex}
									text={choice.text}
									className="flex-1"
								/>
								{choice.correct && (
									<span className="inline-flex shrink-0 items-center gap-1 font-semibold text-sm text-success">
										<CheckIcon aria-hidden="true" className="size-4" />
										Correta
									</span>
								)}
								<span className="shrink-0 font-bold tabular-nums">
									{choice.count}
									<span className="sr-only">
										{choice.count === 1 ? " escolheu" : " escolheram"}
									</span>
								</span>
							</div>
							<div
								aria-hidden="true"
								className="h-1.5 overflow-hidden rounded-full bg-muted"
							>
								<div
									className={
										choice.correct
											? "h-full bg-success"
											: "h-full bg-foreground/40"
									}
									style={{
										width: `${answered > 0 ? (choice.count / answered) * 100 : 0}%`,
									}}
								/>
							</div>
						</li>
					))}
				</ul>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="font-bold">
					Participantes ({detail.participants.length})
				</h3>
				<ul
					aria-label="Respostas dos participantes"
					className="divide-y divide-border"
				>
					{detail.participants.map((participant) => (
						<li
							key={participant.playerId}
							className="flex flex-col gap-1 py-3 text-sm"
						>
							<div className="flex items-center justify-between gap-3">
								<span className="min-w-0 truncate font-semibold">
									{participant.nickname}
								</span>
								<ResultBadge result={participant.result} />
							</div>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
								{participant.choices.map((choice) => (
									<ChoiceChip
										key={choice.shapeIndex}
										shapeIndex={choice.shapeIndex}
										text={choice.text}
									/>
								))}
								<span className="tabular-nums">
									{pointsLabel(participant.points)}{" "}
									{participant.points === 1 ? "ponto" : "pontos"}
								</span>
								{participant.responseTimeMs !== null && (
									<span className="text-muted-foreground tabular-nums">
										{responseTimeLabel(participant.responseTimeMs)}
									</span>
								)}
							</div>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
