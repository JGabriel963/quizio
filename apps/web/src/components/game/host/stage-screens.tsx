import { QUESTION_TYPE_REVEAL_MS } from "@quizio/core/game/domain/game-progress";
import { Button } from "@quizio/ui/components/button";
import { ChevronRightIcon, SkipForwardIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { QuestionTypeIcon } from "@/components/editor/question-type-icon";
import type { HostQuestionData, HostStageData } from "@/lib/api-types";
import { usePrefersReducedMotion } from "@/lib/game-motion";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { useCountdown } from "@/lib/use-countdown";

import { Wordmark } from "../game-screen";
import { AutoCountdown } from "./auto-countdown";
import { AnswerBars, StageChoices } from "./stage-choices";
import { StageImage } from "./stage-image";

/** The white strip with the question, as in Kahoot. */
function QuestionText({ children }: { children: ReactNode }) {
	return (
		<h1 className="w-full rounded-md bg-white px-4 py-3 text-center font-bold text-2xl text-neutral-900 shadow-lg sm:py-5 sm:text-4xl">
			{children}
		</h1>
	);
}

/** The opening of the game: the name and the quiz (spec 009, RN-04). */
export function GameIntro({ title }: { title: string }) {
	return (
		<main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center motion-safe:animate-stage-in">
			<Wordmark className="text-7xl sm:text-9xl" />
			<h1 className="break-words font-black text-3xl sm:text-5xl">{title}</h1>
		</main>
	);
}

/** Where the question is in the game: "1/5". */
function QuestionPosition({
	position,
	questionCount,
}: {
	position: number;
	questionCount: number;
}) {
	return (
		<p className="rounded-full bg-black/50 px-5 py-1.5 font-black text-xl shadow-lg sm:text-2xl">
			<span className="sr-only">Pergunta </span>
			<span data-slot="question-position">
				{position}/{questionCount}
			</span>
		</p>
	);
}

/**
 * The opening of a question, in two steps as in Kahoot (spec 009, RN-07): its
 * type comes in first, large, then the question takes the middle of the
 * screen with the reading time running at the bottom. Where it is in the
 * game shows in both, and the answers in neither. Which step shows comes from
 * the time the server told: a reload goes on from where the intro is. The
 * intro lasts the type's time plus the reading time (`QUESTION_INTRO_MS`).
 */
export function QuestionIntro({
	stage,
	question,
	questionCount,
	receivedAt,
}: {
	stage: HostStageData;
	question: HostQuestionData;
	questionCount: number;
	receivedAt: number;
}) {
	const reducedMotion = usePrefersReducedMotion();
	const { ms } = useCountdown(stage.remainingMs, receivedAt);
	const duration = stage.durationMs ?? 1;
	const elapsedMs = Math.max(0, duration - (ms ?? 0));
	const reveal = reducedMotion
		? 0
		: Math.min(QUESTION_TYPE_REVEAL_MS, duration);
	const showingType = elapsedMs < reveal;
	// The bar runs over the time the question itself is on the screen.
	const read = Math.min(
		1,
		Math.max(0, (elapsedMs - reveal) / Math.max(1, duration - reveal)),
	);
	const position = stage.questionIndex + 1;
	const typeLabel = questionTypeLabel(question.type);

	return (
		<main
			data-step={showingType ? "type" : "question"}
			className="relative flex flex-1 flex-col items-center gap-4 overflow-hidden p-4 sm:gap-6 sm:p-8"
		>
			{showingType ? (
				<div className="flex w-full flex-1 flex-col items-center justify-center">
					<motion.div
						initial={{ scale: 0, rotate: -120 }}
						animate={{ scale: 1, rotate: -14 }}
						transition={{ type: "spring", stiffness: 260, damping: 16 }}
						className="z-10 -mb-12 flex size-44 items-center justify-center rounded-full bg-black/40 sm:size-64"
					>
						<QuestionTypeIcon
							type={question.type}
							className="h-32 w-24 gap-1.5 rounded-xl border-[6px] border-neutral-900 bg-white p-1.5 shadow-xl sm:h-48 sm:w-36 sm:gap-2 sm:border-8 sm:p-2 [&>span]:rounded-sm"
						/>
					</motion.div>
					<motion.h1
						initial={{ opacity: 0, scaleX: 0.3 }}
						animate={{ opacity: 1, scaleX: 1 }}
						transition={{ duration: 0.35, delay: 0.15 }}
						className="w-full bg-black/40 px-4 pt-14 pb-6 text-center font-black text-6xl sm:text-8xl"
					>
						{typeLabel}
					</motion.h1>
				</div>
			) : (
				<>
					<p className="flex size-14 shrink-0 items-center justify-center rounded-full bg-black/40 motion-safe:animate-pop-in sm:size-16">
						<QuestionTypeIcon
							type={question.type}
							className="border-neutral-900 bg-white"
						/>
						<span className="sr-only">{typeLabel}</span>
					</p>
					<div className="flex w-full max-w-6xl flex-1 items-center motion-safe:animate-stage-in">
						<QuestionText>{question.text}</QuestionText>
					</div>
				</>
			)}
			<QuestionPosition position={position} questionCount={questionCount} />
			{!showingType && (
				<div
					role="progressbar"
					aria-label="Tempo de leitura"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(read * 100)}
					className="h-4 w-full shrink-0 overflow-hidden rounded-full bg-black/30"
				>
					<div
						className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
						style={{ width: `${read * 100}%` }}
					/>
				</div>
			)}
		</main>
	);
}

/** The body the answers and the results share: the question on top, the answers at the bottom. */
function QuestionStage({
	question,
	action,
	children,
}: {
	question: HostQuestionData;
	action: ReactNode;
	children: ReactNode;
}) {
	return (
		<main className="relative flex min-h-0 flex-1 flex-col">
			{/* As in Kahoot: the question in a card at the center, the action at the right edge. */}
			<div className="grid grid-cols-1 items-start gap-2 p-2 sm:grid-cols-[1fr_minmax(0,40rem)_1fr] sm:p-4">
				<div className="sm:col-start-2">
					<QuestionText>{question.text}</QuestionText>
				</div>
				<div className="flex justify-end">{action}</div>
			</div>
			<div className="flex min-h-0 flex-1 items-stretch gap-4 px-4 pb-2">
				{children}
			</div>
			<StageChoices choices={question.choices} />
		</main>
	);
}

/**
 * The answers phase: the time left, how many answered, the image and the
 * answers (spec 009, RN-09, RN-10).
 */
export function Answering({
	stage,
	question,
	receivedAt,
	busy,
	onSkip,
}: {
	stage: HostStageData;
	question: HostQuestionData;
	receivedAt: number;
	busy: boolean;
	onSkip: () => void;
}) {
	const { seconds } = useCountdown(stage.remainingMs, receivedAt);

	return (
		<QuestionStage
			question={question}
			action={
				<Button variant="game" disabled={busy} onClick={onSkip}>
					<SkipForwardIcon aria-hidden="true" />
					Pular o cronômetro
				</Button>
			}
		>
			<div className="flex shrink-0 items-center">
				<p
					role="timer"
					aria-label="Tempo restante"
					className="flex size-20 items-center justify-center rounded-full bg-brand-strong font-black text-3xl shadow-lg sm:size-28 sm:text-5xl"
				>
					<span data-slot="time-left">{seconds}</span>
				</p>
			</div>
			<div className="flex min-w-0 flex-1 items-center justify-center">
				<StageImage image={question.image} />
			</div>
			<p className="flex shrink-0 flex-col items-center justify-center gap-1">
				<span
					// Each answer that comes in makes the number jump.
					key={stage.answerCount}
					data-slot="answer-count"
					className="flex size-16 items-center justify-center rounded-full bg-brand-strong font-black text-3xl shadow-lg motion-safe:animate-pop-in sm:size-20 sm:text-4xl"
				>
					{stage.answerCount}
				</span>
				<span className="rounded-full bg-brand-strong px-2.5 py-0.5 font-bold text-sm">
					{stage.answerCount === 1 ? "resposta" : "respostas"}
				</span>
			</p>
		</QuestionStage>
	);
}

/**
 * The results: who chose what, and which answers were right. They stay until
 * the host advances (spec 009, RN-11, RN-22) or, with autoplay, until its
 * countdown, which takes the button's place (spec 014, RN-11, RN-13).
 */
export function Results({
	stage,
	question,
	auto = null,
	busy,
	onAdvance,
}: {
	stage: HostStageData;
	question: HostQuestionData;
	/** Autoplay's countdown to move on, when it is on. */
	auto?: { remainingMs: number; receivedAt: number } | null;
	busy: boolean;
	onAdvance: () => void;
}) {
	return (
		<QuestionStage
			question={question}
			action={
				auto ? (
					<AutoCountdown
						label="Avança em"
						remainingMs={auto.remainingMs}
						receivedAt={auto.receivedAt}
					/>
				) : (
					<Button variant="secondary" disabled={busy} onClick={onAdvance}>
						Avançar
						<ChevronRightIcon aria-hidden="true" />
					</Button>
				)
			}
		>
			{question.image?.placement === "media" && (
				<div className="hidden min-w-0 flex-1 items-center justify-center sm:flex">
					<StageImage image={question.image} />
				</div>
			)}
			<div className="flex min-w-0 flex-1 items-end justify-center">
				{stage.distribution && (
					<AnswerBars
						choices={question.choices}
						distribution={stage.distribution}
					/>
				)}
			</div>
		</QuestionStage>
	);
}
