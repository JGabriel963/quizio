import type { ReactNode } from "react";

import { QuestionImageView } from "@/components/editor/question-image-view";
import type { PlayerQuestionData, PlayerStageData } from "@/lib/api-types";
import { useCountdown } from "@/lib/use-countdown";

/**
 * What the phone shows of the question itself when the host turned "Mostrar
 * perguntas nos dispositivos" on (spec 012, RN-18 to RN-20): the statement,
 * the image and the time. Which answer is right is never here.
 */

/** The white strip with the statement, as on the host's screen. */
function Statement({ children }: { children: ReactNode }) {
	return (
		<h1 className="w-full break-words rounded-md bg-white px-3 py-2 text-center font-bold text-lg text-neutral-900 leading-snug shadow-lg sm:text-2xl">
			{children}
		</h1>
	);
}

/** The opening of a question: its statement and the reading time (RN-18a). */
export function DeviceQuestionIntro({
	stage,
	text,
	receivedAt,
}: {
	stage: PlayerStageData;
	text: string;
	receivedAt: number;
}) {
	const { ms } = useCountdown(stage.remainingMs, receivedAt);
	const duration = stage.durationMs ?? 1;
	const elapsed = Math.min(1, Math.max(0, 1 - (ms ?? 0) / duration));

	return (
		<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-4 motion-safe:animate-stage-in">
			<div className="w-full max-w-2xl motion-safe:animate-pop-in">
				<Statement>{text}</Statement>
			</div>
			<div
				role="progressbar"
				aria-label="Tempo de leitura"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(elapsed * 100)}
				className="h-3 w-full max-w-md overflow-hidden rounded-full bg-black/30"
			>
				<div
					className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
					style={{ width: `${elapsed * 100}%` }}
				/>
			</div>
		</main>
	);
}

/**
 * The answers phase with the question on the phone (RN-18b): the image, if
 * any, the statement, the buttons (`children`) and the time left. An image
 * the editor set as background shows here like any other (RN-20).
 */
export function DeviceQuestion({
	stage,
	question,
	receivedAt,
	children,
}: {
	stage: PlayerStageData;
	question: PlayerQuestionData;
	receivedAt: number;
	/** The answer buttons. */
	children: ReactNode;
}) {
	return (
		<main className="flex min-h-0 flex-1 flex-col motion-safe:animate-stage-in">
			<div className="flex shrink-0 flex-col items-center gap-2 px-2 pt-1">
				{question.image && (
					<div
						data-slot="device-question-image"
						className="h-[22svh] max-h-48 w-full"
					>
						<QuestionImageView
							image={question.image}
							url={question.image.url}
							className="rounded-md"
						/>
					</div>
				)}
				{question.text !== null && <Statement>{question.text}</Statement>}
			</div>
			{children}
			<TimeBar stage={stage} receivedAt={receivedAt} />
		</main>
	);
}

/** The time left to answer: the seconds and a bar that runs out with them. */
function TimeBar({
	stage,
	receivedAt,
}: {
	stage: PlayerStageData;
	receivedAt: number;
}) {
	const { ms, seconds } = useCountdown(stage.remainingMs, receivedAt);
	if (ms === null || seconds === null) {
		return null;
	}
	const left = Math.min(1, Math.max(0, ms / (stage.durationMs ?? 1)));

	return (
		<div className="flex shrink-0 items-center gap-2 px-2 pb-2">
			<p
				role="timer"
				aria-label="Tempo restante"
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white font-black text-neutral-900 text-sm"
			>
				{seconds}
			</p>
			<div
				aria-hidden="true"
				className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-black/30"
			>
				<div
					className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
					style={{ width: `${left * 100}%` }}
				/>
			</div>
		</div>
	);
}
