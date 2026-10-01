import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

import type { HostQuestionData, HostStageData } from "@/lib/api-types";

type HostChoice = HostQuestionData["choices"][number];

/** `correct` is null until the results (spec 009, RN-21). */
function stateOf(choice: HostChoice): "idle" | "correct" | "incorrect" {
	if (choice.correct === null) {
		return "idle";
	}
	return choice.correct ? "correct" : "incorrect";
}

/**
 * The answers at the bottom of the host's screen, in strips of color with the
 * shape and the text, two per row (spec 009, RN-09, RN-27). In the results the
 * right ones get a check and the others fade, with a cross (RN-22).
 */
export function StageChoices({ choices }: { choices: HostChoice[] }) {
	return (
		<ul
			aria-label="Respostas"
			className="relative grid shrink-0 grid-cols-2 gap-2 p-2"
		>
			{choices.map((choice) => {
				const shape = answerShapeAt(choice.shapeIndex);
				const state = stateOf(choice);
				return (
					<li
						key={choice.id}
						data-slot="stage-choice"
						data-shape={shape}
						data-state={state}
						className={cn(
							"flex min-h-14 items-center gap-3 rounded-md px-4 py-2 font-bold text-answer-foreground text-lg shadow-press sm:min-h-20 sm:text-2xl",
							ANSWER_COLOR_CLASSES[shape],
							state === "incorrect" && "opacity-40",
						)}
					>
						<AnswerShape shape={shape} className="size-7 shrink-0 sm:size-9" />
						<span className="min-w-0 flex-1 break-words">{choice.text}</span>
						{state === "correct" && (
							<>
								<CheckIcon
									aria-hidden="true"
									className="size-7 shrink-0 stroke-3 sm:size-9"
								/>
								<span className="sr-only">Resposta correta</span>
							</>
						)}
						{state === "incorrect" && (
							<>
								<XIcon
									aria-hidden="true"
									className="size-7 shrink-0 stroke-3 sm:size-9"
								/>
								<span className="sr-only">Resposta incorreta</span>
							</>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/**
 * One bar per answer with how many players chose it (spec 009, RN-22). The
 * bars share a scale; an answer nobody chose still has its label.
 */
export function AnswerBars({
	choices,
	distribution,
}: {
	choices: HostChoice[];
	distribution: NonNullable<HostStageData["distribution"]>;
}) {
	const countOf = (choiceId: string) =>
		distribution.find((entry) => entry.choiceId === choiceId)?.count ?? 0;
	const highest = Math.max(1, ...distribution.map((entry) => entry.count));

	return (
		<ul
			aria-label="Distribuição das respostas"
			className="flex h-full min-h-32 w-full max-w-3xl items-end justify-center gap-3 sm:gap-6"
		>
			{choices.map((choice) => {
				const shape = answerShapeAt(choice.shapeIndex);
				const count = countOf(choice.id);
				return (
					<li
						key={choice.id}
						data-slot="answer-bar"
						data-shape={shape}
						data-correct={choice.correct === true}
						aria-label={`${choice.text}: ${count} ${count === 1 ? "resposta" : "respostas"}`}
						className="flex h-full w-full max-w-28 flex-col justify-end"
					>
						<div
							className={cn(
								"min-h-1 rounded-t-md",
								ANSWER_COLOR_CLASSES[shape],
								choice.correct === false && "opacity-50",
							)}
							style={{ height: `${(count / highest) * 100}%` }}
						/>
						<div
							className={cn(
								"flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-b-md font-black text-answer-foreground text-xl",
								ANSWER_COLOR_CLASSES[shape],
							)}
						>
							<AnswerShape shape={shape} className="size-5" />
							<span data-slot="answer-bar-count">{count}</span>
							{choice.correct === true && (
								<CheckIcon aria-hidden="true" className="size-5 stroke-3" />
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
