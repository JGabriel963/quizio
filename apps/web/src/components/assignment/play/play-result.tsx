import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import type { QuestionResultData } from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";
import { usePrefersReducedMotion } from "@/lib/game-motion";
import { formatSliderNumber } from "@/lib/slider-format";

import {
	ANSWER_GRID_CLASS,
	ProgressSegments,
	QuestionLayout,
} from "./play-stage";

/** How long "Correto" shows before it turns into the points, as in Kahoot. */
export const RESULT_POINTS_DELAY_MS = 1200;
/** How long the result shows before Pontuações comes by itself (RN-12). */
export const RESULT_SHOW_MS = 3200;

const STRIP = {
	correct: { label: "Correto", className: "bg-answer-correct", right: true },
	partiallyCorrect: {
		label: "Parcialmente correto",
		className: "bg-answer-yellow",
		right: true,
	},
	almostCorrect: {
		label: "Quase correto",
		className: "bg-answer-yellow",
		right: true,
	},
	wrong: { label: "Incorreto", className: "bg-answer-red", right: false },
	unanswered: {
		label: "Tempo esgotado",
		className: "bg-answer-red",
		right: false,
	},
} as const;

/**
 * A question's results on the participant's screen (spec 030, RN-11), in
 * the question's own layout so nothing moves: the image gives its place to
 * a tilted strip with the result which, for a right answer, turns into the
 * points; the answers stay where they were, the right one green, the one
 * chosen wrong red and the others faded. It also serves the review of "←",
 * where it shows its final state at once (`animate` off).
 */
export function PlayResult({
	result,
	questionCount,
	animate = true,
}: {
	result: QuestionResultData;
	questionCount: number;
	animate?: boolean;
}) {
	return (
		<>
			<ProgressSegments index={result.question.index} count={questionCount} />
			<QuestionLayout
				text={result.question.text}
				top={<ResultStrip result={result} animate={animate} />}
				answers={
					result.sliderAnswer ? (
						<SliderResult result={result} slider={result.sliderAnswer} />
					) : result.question.type === "typeAnswer" ? (
						<TypedResult result={result} />
					) : (
						<ResultAnswers result={result} />
					)
				}
			/>
		</>
	);
}

function ResultStrip({
	result,
	animate,
}: {
	result: QuestionResultData;
	animate: boolean;
}) {
	const reduced = usePrefersReducedMotion();
	const strip = STRIP[result.result];
	const scores = strip.right && result.points > 0;
	const [showPoints, setShowPoints] = useState(scores && !animate);

	useEffect(() => {
		if (!scores || !animate) {
			return;
		}
		const timer = setTimeout(() => setShowPoints(true), RESULT_POINTS_DELAY_MS);
		return () => clearTimeout(timer);
	}, [scores, animate]);

	const moving = animate && !reduced;

	return (
		<motion.div
			data-slot="result-strip"
			initial={moving ? { scaleX: 0, opacity: 0 } : false}
			animate={{ scaleX: 1, opacity: 1 }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			className={cn(
				"-mx-8 flex h-16 w-[calc(100%+4rem)] origin-left -rotate-3 items-center justify-center text-white shadow-lg sm:h-20",
				strip.className,
			)}
		>
			<AnimatePresence mode="wait" initial={false}>
				{showPoints ? (
					<motion.span
						key="points"
						initial={moving ? { y: 16, opacity: 0 } : false}
						animate={{ y: 0, opacity: 1 }}
						className="font-black text-2xl sm:text-3xl"
					>
						<CountUp
							prefix="+ "
							from={moving ? 0 : result.points}
							value={result.points}
						/>
					</motion.span>
				) : (
					<motion.span
						key="label"
						initial={moving ? { scale: 0.6, opacity: 0 } : false}
						animate={{ scale: 1, opacity: 1 }}
						exit={moving ? { y: -16, opacity: 0 } : undefined}
						transition={{ delay: moving ? 0.2 : 0 }}
						className="flex items-center gap-3 font-black text-2xl sm:text-3xl"
					>
						<span className="flex size-8 items-center justify-center rounded-full border-2 border-white">
							{strip.right ? (
								<CheckIcon aria-hidden="true" className="size-5 stroke-3" />
							) : (
								<XIcon aria-hidden="true" className="size-5 stroke-3" />
							)}
						</span>
						{strip.label}
					</motion.span>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

/**
 * A type answer's results (spec 031, RN-35): what the participant typed, with
 * its mark, and the accepted answers.
 */
function TypedResult({ result }: { result: QuestionResultData }) {
	const right = result.result === "correct";
	return (
		<div className="flex min-h-0 flex-col items-center gap-3 overflow-y-auto p-2">
			{result.typedText !== null && (
				<p
					data-right={right}
					className={cn(
						"flex w-full max-w-md items-center justify-center gap-2 rounded-md px-4 py-4 font-black text-2xl text-white shadow-press",
						right ? "bg-answer-correct" : "bg-answer-red",
					)}
				>
					{right ? (
						<CheckIcon aria-hidden="true" className="size-6 stroke-3" />
					) : (
						<XIcon aria-hidden="true" className="size-6 stroke-3" />
					)}
					<span className="sr-only">Sua resposta:</span>
					{result.typedText}
				</p>
			)}
			<section
				aria-labelledby="accepted-answers"
				className="flex flex-col items-center gap-2"
			>
				<h2 id="accepted-answers" className="font-bold">
					As respostas corretas são:
				</h2>
				<ul className="flex flex-wrap justify-center gap-2">
					{result.acceptedAnswers.map((answer) => (
						<li
							key={answer}
							className="rounded-md bg-answer-correct px-3 py-1.5 font-bold text-white"
						>
							{answer}
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

/** A slider's result: the value sent and the answer with its margin (spec 032, RN-34). */
function SliderResult({
	result,
	slider,
}: {
	result: QuestionResultData;
	slider: NonNullable<QuestionResultData["sliderAnswer"]>;
}) {
	const withUnit = (value: number, whole = false) => {
		const number = formatSliderNumber(value, { whole });
		return slider.unit ? `${number} ${slider.unit}` : number;
	};
	const right =
		result.result === "correct" || result.result === "almostCorrect";
	return (
		<div className="flex min-h-0 flex-col items-center gap-3 overflow-y-auto p-2">
			{result.sliderValue !== null && (
				<p
					data-right={right}
					className={cn(
						"flex w-full max-w-md items-center justify-center gap-2 rounded-md px-4 py-4 font-black text-2xl text-white shadow-press",
						right ? "bg-answer-correct" : "bg-answer-red",
					)}
				>
					{right ? (
						<CheckIcon aria-hidden="true" className="size-6 stroke-3" />
					) : (
						<XIcon aria-hidden="true" className="size-6 stroke-3" />
					)}
					<span className="sr-only">Sua resposta:</span>
					{withUnit(result.sliderValue)}
				</p>
			)}
			<section
				aria-labelledby="slider-answer"
				className="flex flex-col items-center gap-1"
			>
				<h2 id="slider-answer" className="font-bold">
					A resposta correta é:
				</h2>
				<p className="rounded-md bg-answer-correct px-3 py-1.5 font-black text-white text-xl">
					{withUnit(slider.answer)}
				</p>
				{slider.low !== slider.high && (
					<p className="font-semibold text-sm">
						Margem de resposta: {withUnit(slider.low, true)} a{" "}
						{withUnit(slider.high, true)}
					</p>
				)}
			</section>
		</div>
	);
}

function ResultAnswers({ result }: { result: QuestionResultData }) {
	return (
		<div className="flex min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2">
			<ul aria-label="Respostas" className={ANSWER_GRID_CLASS}>
				{result.question.choices.map((choice) => {
					const right = result.rightIds.includes(choice.id);
					const chosen = result.chosenIds.includes(choice.id);
					return (
						<li
							key={choice.id}
							data-right={right}
							data-chosen={chosen}
							className={cn(
								"relative flex items-center justify-center rounded-md px-3 py-8 shadow-press transition-colors duration-300",
								right
									? "bg-answer-correct text-white"
									: chosen
										? "bg-answer-red text-white"
										: "bg-answer-red/35 text-white/60 shadow-none",
							)}
						>
							<span className="w-full break-words text-center font-bold text-lg leading-tight sm:text-2xl">
								{choice.text}
							</span>
							<span
								aria-hidden="true"
								className={cn(
									"absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full text-white ring-2 ring-white/80 motion-safe:animate-pop-in",
									right ? "bg-answer-correct" : "bg-answer-red",
									!right && !chosen && "opacity-60",
								)}
							>
								{right ? (
									<CheckIcon className="size-4 stroke-3" />
								) : (
									<XIcon className="size-4 stroke-3" />
								)}
							</span>
							{right && <span className="sr-only">Correta</span>}
							{chosen && <span className="sr-only">Sua resposta</span>}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
