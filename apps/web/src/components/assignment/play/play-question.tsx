import { QuestionImageView } from "@/components/editor/question-image-view";
import { AnswerButtons } from "@/components/game/player/answer-buttons";
import { DeviceBackground } from "@/components/game/player/question-on-device";
import { TypedAnswerInput } from "@/components/game/player/typed-answer-input";
import type { PlayerQuestionData, PlayQuestionData } from "@/lib/api-types";
import { useCountdown } from "@/lib/use-countdown";

import { ProgressSegments, QuestionLayout } from "./play-stage";

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

/**
 * A question of the assignment (spec 030, RN-08 to RN-10): the progress, the
 * image, the statement, the answers with their texts and the time, in the
 * card the result keeps (`QuestionLayout`). Without the question timer there
 * is no bar.
 */
export function PlayQuestion({
	question,
	questionCount,
	remainingMs,
	durationMs,
	receivedAt,
	failure,
	onAnswer,
	onType,
}: {
	question: PlayQuestionData;
	questionCount: number;
	remainingMs: number | null;
	durationMs: number | null;
	receivedAt: number;
	/** Why the last answer did not go; null otherwise. */
	failure: string | null;
	onAnswer: (choiceIds: string[]) => void;
	/** The typed answer of a type answer (spec 031, RN-34). */
	onType: (text: string) => void;
}) {
	const media = question.image?.placement === "media" ? question.image : null;

	return (
		<>
			<ProgressSegments index={question.index} count={questionCount} />
			<QuestionLayout
				text={question.text}
				background={<DeviceBackground image={question.image} />}
				top={
					<>
						{media && (
							<QuestionImageView
								image={media}
								url={media.url}
								className="max-h-full rounded-md motion-safe:animate-pop-in"
							/>
						)}
						{failure && (
							<p
								role="alert"
								className="absolute inset-x-2 bottom-0 rounded-md bg-destructive px-3 py-2 text-center font-bold text-white"
							>
								{failure}
							</p>
						)}
					</>
				}
				answers={
					question.type === "typeAnswer" ? (
						<div className="flex items-center p-2">
							<TypedAnswerInput key={question.index} onSubmit={onType} />
						</div>
					) : (
						<AnswerButtons
							key={question.index}
							question={asDeviceQuestion(question)}
							onAnswer={onAnswer}
						/>
					)
				}
				footer={
					<TimeBar
						remainingMs={remainingMs}
						durationMs={durationMs}
						receivedAt={receivedAt}
					/>
				}
			/>
		</>
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
		<div className="h-6 w-full overflow-hidden rounded-full bg-black/40">
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
	);
}
