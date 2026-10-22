import { CheckIcon, ClockIcon, XIcon } from "lucide-react";

import type { QuestionDetailData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { averageTimeLabel, responseTimeLabel } from "@/lib/report-labels";
import { formatSliderNumber } from "@/lib/slider-format";

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
				{detail.typedAnswers && (
					<TypedAnswers answers={detail.typedAnswers} answered={answered} />
				)}
				{detail.sliderAnswers && (
					<SliderAnswers answers={detail.sliderAnswers} answered={answered} />
				)}
				{/* A type answer has no alternatives: its list is empty. */}
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
								{participant.typedText !== null && (
									<span className="font-semibold">
										“{participant.typedText}”
									</span>
								)}
								{participant.sliderValue !== null && (
									<span className="font-semibold">
										{formatSliderNumber(participant.sliderValue)}
										{detail.sliderAnswers?.unit &&
											` ${detail.sliderAnswers.unit}`}
									</span>
								)}
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

/**
 * What was typed in a type answer, grouped as the game grouped it: the correct
 * ones first, the accepted answers nobody sent with 0 (spec 031, RN-37).
 */
/**
 * A slider's answers (spec 032, RN-36): the answer with its margin, the
 * average and each value sent, the nearest first, with how many sent it.
 */
function SliderAnswers({
	answers,
	answered,
}: {
	answers: NonNullable<QuestionDetailData["sliderAnswers"]>;
	answered: number;
}) {
	const withUnit = (value: number, whole = false) => {
		const number = formatSliderNumber(value, { whole });
		return answers.unit ? `${number} ${answers.unit}` : number;
	};
	return (
		<div className="flex flex-col gap-3">
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted/60 p-3 text-sm">
				<dt className="text-muted-foreground">Resposta correta</dt>
				<dd className="font-bold">{withUnit(answers.answer)}</dd>
				{answers.low !== answers.high && (
					<>
						<dt className="text-muted-foreground">Margem de resposta</dt>
						<dd className="font-bold">
							{withUnit(answers.low, true)} a {withUnit(answers.high, true)}
						</dd>
					</>
				)}
				<dt className="text-muted-foreground">Média das respostas</dt>
				<dd className="font-bold">
					{answers.average === null ? "—" : withUnit(answers.average)}
				</dd>
			</dl>
			<ul aria-label="Valores enviados" className="flex flex-col gap-2">
				{answers.values.map(({ value, count, correctness }) => (
					<li
						key={value}
						className="flex flex-col gap-1 rounded-md p-3 ring-1 ring-foreground/10"
					>
						<div className="flex items-center gap-3">
							<span className="min-w-0 flex-1 font-semibold">
								{withUnit(value)}
							</span>
							<ResultBadge result={correctness} />
							<span className="shrink-0 font-bold tabular-nums">
								{count}
								<span className="sr-only">
									{count === 1 ? " enviou" : " enviaram"}
								</span>
							</span>
						</div>
						<div
							aria-hidden="true"
							className="h-1.5 overflow-hidden rounded-full bg-muted"
						>
							<div
								className={
									correctness === "wrong"
										? "h-full bg-foreground/40"
										: "h-full bg-success"
								}
								style={{
									width: `${answered > 0 ? (count / answered) * 100 : 0}%`,
								}}
							/>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function TypedAnswers({
	answers,
	answered,
}: {
	answers: NonNullable<QuestionDetailData["typedAnswers"]>;
	answered: number;
}) {
	return (
		<ul aria-label="Respostas digitadas" className="flex flex-col gap-2">
			{answers.map((answer) => (
				<li
					key={answer.text}
					className="flex flex-col gap-1 rounded-md p-3 ring-1 ring-foreground/10"
				>
					<div className="flex items-center gap-3">
						<span className="min-w-0 flex-1 break-words font-semibold">
							{answer.text}
						</span>
						<span
							className={
								answer.correct
									? "inline-flex shrink-0 items-center gap-1 font-semibold text-sm text-success"
									: "inline-flex shrink-0 items-center gap-1 font-semibold text-destructive text-sm"
							}
						>
							{answer.correct ? (
								<CheckIcon aria-hidden="true" className="size-4" />
							) : (
								<XIcon aria-hidden="true" className="size-4" />
							)}
							{answer.correct ? "Correta" : "Incorreta"}
						</span>
						<span className="shrink-0 font-bold tabular-nums">
							{answer.count}
							<span className="sr-only">
								{answer.count === 1 ? " enviou" : " enviaram"}
							</span>
						</span>
					</div>
					<div
						aria-hidden="true"
						className="h-1.5 overflow-hidden rounded-full bg-muted"
					>
						<div
							className={
								answer.correct ? "h-full bg-success" : "h-full bg-foreground/40"
							}
							style={{
								width: `${answered > 0 ? (answer.count / answered) * 100 : 0}%`,
							}}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}
