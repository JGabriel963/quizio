import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

import { Statement } from "@/components/game/player/question-on-device";
import type { QuestionResultData } from "@/lib/api-types";
import { ProgressSegments } from "./play-question";

const BANNER = {
	correct: { label: "Correto", className: "bg-answer-correct" },
	partiallyCorrect: {
		label: "Parcialmente correto",
		className: "bg-answer-yellow",
	},
	wrong: { label: "Incorreto", className: "bg-answer-red" },
	unanswered: { label: "Tempo esgotado", className: "bg-answer-red" },
} as const;

/**
 * A question's results on the participant's screen (spec 030, RN-11): the
 * strip with the result and the points, then the answers, the chosen and the
 * right ones marked and the others dimmed. It also serves the review of "←".
 */
export function PlayResult({
	result,
	questionCount,
}: {
	result: QuestionResultData;
	questionCount: number;
}) {
	const banner = BANNER[result.result];

	return (
		<main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 motion-safe:animate-stage-in">
			<ProgressSegments index={result.question.index} count={questionCount} />
			<div
				className={cn(
					"mx-2 flex shrink-0 items-center justify-between gap-3 rounded-md px-4 py-3 font-black text-xl shadow-lg motion-safe:animate-pop-in",
					banner.className,
				)}
			>
				<span>{banner.label}</span>
				<span>+ {result.points}</span>
			</div>
			<div className="shrink-0 px-2">
				<Statement>{result.question.text}</Statement>
			</div>
			<ul aria-label="Respostas" className="grid grid-cols-2 gap-2 px-2 pb-2">
				{result.question.choices.map((choice) => {
					const right = result.rightIds.includes(choice.id);
					const chosen = result.chosenIds.includes(choice.id);
					const shape = answerShapeAt(choice.shapeIndex);
					return (
						<li
							key={choice.id}
							className={cn(
								"relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-md px-3 py-6 text-answer-foreground shadow-press",
								ANSWER_COLOR_CLASSES[shape],
								!right && !chosen && "opacity-40",
								chosen && "ring-4 ring-white",
							)}
						>
							<AnswerShape
								shape={shape}
								className="absolute top-2 left-2 size-5 drop-shadow-sm"
							/>
							<span className="w-full break-words text-center font-bold text-lg leading-tight">
								{choice.text}
							</span>
							{right ? (
								<span className="inline-flex items-center gap-1 font-semibold text-sm">
									<CheckIcon aria-hidden="true" className="size-4 stroke-3" />
									Correta
								</span>
							) : (
								chosen && (
									<XIcon
										aria-hidden="true"
										className="absolute top-2 right-2 size-5 stroke-3"
									/>
								)
							)}
							{chosen && (
								<span className="font-semibold text-sm">Sua resposta</span>
							)}
						</li>
					);
				})}
			</ul>
		</main>
	);
}
