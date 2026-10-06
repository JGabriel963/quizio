import type { ParticipantDetailData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { responseTimeLabel, unansweredLabel } from "@/lib/report-labels";

import { AccuracyRing } from "./accuracy-ring";
import { ChoiceChip, pointsLabel, ResultBadge } from "./report-parts";

/**
 * What one participant did, question by question, in the order the game was
 * played (spec 015, RN-42). Only their questions: what came before a late
 * arrival is not listed.
 */
export function ParticipantDetail({
	detail,
}: {
	detail: ParticipantDetailData;
}) {
	return (
		<div className="flex flex-col gap-5">
			<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<Stat label="Classificação">{detail.rank}</Stat>
				<Stat label="Pontuação final">{pointsLabel(detail.total)}</Stat>
				<Stat label="Respostas corretas">
					<AccuracyRing percent={detail.accuracyPercent} />
				</Stat>
				<Stat label="Não respondido">
					{detail.unanswered === 0 ? "—" : detail.unanswered}
				</Stat>
			</dl>

			{detail.answers.length === 0 ? (
				<p className="py-6 text-center text-muted-foreground">
					A partida acabou antes de este participante ter uma pergunta para
					responder.
				</p>
			) : (
				<ol aria-label="Respostas" className="flex flex-col gap-3">
					{detail.answers.map((answer) => (
						<li
							key={answer.questionIndex}
							className="flex flex-col gap-2 rounded-md p-3 ring-1 ring-foreground/10"
						>
							<span className="text-muted-foreground text-xs">
								{answer.questionIndex + 1} - {questionTypeLabel(answer.type)}
							</span>
							<span className="break-words font-bold">{answer.text}</span>
							{answer.choices.length > 0 && (
								<ul
									aria-label="Resposta enviada"
									className="flex flex-col gap-1 text-sm"
								>
									{answer.choices.map((choice) => (
										<li key={choice.shapeIndex}>
											<ChoiceChip
												shapeIndex={choice.shapeIndex}
												text={choice.text}
											/>
										</li>
									))}
								</ul>
							)}
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
								<ResultBadge result={answer.result} />
								<span className="tabular-nums">
									{pointsLabel(answer.points)}{" "}
									{answer.points === 1 ? "ponto" : "pontos"}
								</span>
								{answer.responseTimeMs !== null && (
									<span className="text-muted-foreground tabular-nums">
										{responseTimeLabel(answer.responseTimeMs)}
									</span>
								)}
							</div>
						</li>
					))}
				</ol>
			)}
			{detail.unanswered > 0 && (
				<p className="sr-only">{unansweredLabel(detail.unanswered)}</p>
			)}
		</div>
	);
}

function Stat({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-md bg-muted/60 p-3">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-bold tabular-nums">{children}</dd>
		</div>
	);
}
