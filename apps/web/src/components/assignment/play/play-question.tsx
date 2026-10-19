import { cn } from "@quizio/ui/lib/utils";

import { QuestionImageView } from "@/components/editor/question-image-view";
import { AnswerButtons } from "@/components/game/player/answer-buttons";
import {
	DeviceBackground,
	Statement,
} from "@/components/game/player/question-on-device";
import type { PlayerQuestionData, PlayQuestionData } from "@/lib/api-types";
import { useCountdown } from "@/lib/use-countdown";

/** The question in the shape the live game's buttons take (spec 012). */
export function asDeviceQuestion(
	question: PlayQuestionData,
): PlayerQuestionData {
	return {
		type: question.type,
		selection: question.selection,
		text: question.text,
		image: question.image,
		choices: question.choices.map((choice) => ({
			id: choice.id,
			shapeIndex: choice.shapeIndex,
			label: question.type === "trueFalse" ? choice.text : null,
			text: choice.text,
		})),
	};
}

/** One segment per question, the ones done filled, as in Kahoot (RN-08). */
export function ProgressSegments({
	index,
	count,
}: {
	index: number;
	count: number;
}) {
	return (
		<div
			role="progressbar"
			aria-label={`Pergunta ${index + 1} de ${count}`}
			aria-valuemin={1}
			aria-valuemax={count}
			aria-valuenow={index + 1}
			className="flex shrink-0 gap-1 px-2 pt-2"
		>
			{Array.from({ length: count }, (_, segment) => (
				<span
					key={segment}
					className={cn(
						"h-1.5 flex-1 rounded-full",
						segment <= index ? "bg-white" : "bg-white/30",
					)}
				/>
			))}
		</div>
	);
}

/**
 * A question of the assignment (spec 030, RN-08 to RN-10): the progress, the
 * image, the statement, the answers with their texts and the time, laid out
 * as the live game's phone. Without the question timer there is no bar.
 */
export function PlayQuestion({
	question,
	questionCount,
	remainingMs,
	durationMs,
	receivedAt,
	failure,
	onAnswer,
}: {
	question: PlayQuestionData;
	questionCount: number;
	remainingMs: number | null;
	durationMs: number | null;
	receivedAt: number;
	/** Why the last answer did not go; null otherwise. */
	failure: string | null;
	onAnswer: (choiceIds: string[]) => void;
}) {
	const media = question.image?.placement === "media" ? question.image : null;

	return (
		<main className="relative isolate mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col motion-safe:animate-stage-in">
			<DeviceBackground image={question.image} />
			<ProgressSegments index={question.index} count={questionCount} />
			<div className="flex min-h-0 flex-1 basis-24 items-center justify-center px-2 pt-2">
				{media && (
					<QuestionImageView
						image={media}
						url={media.url}
						className="max-h-full rounded-md"
					/>
				)}
			</div>
			<div className="shrink-0 px-2 pt-2">
				<Statement>{question.text}</Statement>
			</div>
			{failure && (
				<p
					role="alert"
					className="mx-2 mt-2 shrink-0 rounded-md bg-destructive px-3 py-2 text-center font-bold text-white"
				>
					{failure}
				</p>
			)}
			<AnswerButtons
				key={question.index}
				question={asDeviceQuestion(question)}
				onAnswer={onAnswer}
			/>
			<TimeBar
				remainingMs={remainingMs}
				durationMs={durationMs}
				receivedAt={receivedAt}
			/>
		</main>
	);
}

function TimeBar({
	remainingMs,
	durationMs,
	receivedAt,
}: {
	remainingMs: number | null;
	durationMs: number | null;
	receivedAt: number;
}) {
	const { ms, seconds } = useCountdown(remainingMs, receivedAt);
	if (ms === null || seconds === null || durationMs === null) {
		return null;
	}
	const left = Math.min(1, Math.max(0, ms / durationMs));

	return (
		<div className="shrink-0 px-2 pb-2">
			<div className="h-6 overflow-hidden rounded-full bg-black/40">
				<div
					className="flex h-full min-w-10 items-center justify-end rounded-full bg-brand-strong px-2.5 ring-1 ring-white/30 transition-[width] duration-200 ease-linear"
					style={{ width: `${left * 100}%` }}
				>
					<span
						role="timer"
						aria-label="Tempo restante"
						className="font-black text-sm leading-none"
					>
						{seconds}
					</span>
				</div>
			</div>
		</div>
	);
}
