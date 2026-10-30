import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { cn } from "@quizio/ui/lib/utils";
import type { ReactNode } from "react";
import {
	QUESTION_IMAGE_FALLBACK_ALT,
	QuestionImageView,
} from "@/components/editor/question-image-view";
import { FormattedText } from "@/components/quiz/formatted-text";
import type { PlayerQuestionData, PlayerStageData } from "@/lib/api-types";
import { useCountdown } from "@/lib/use-countdown";

type DeviceImage = NonNullable<PlayerQuestionData["image"]>;

/**
 * What the phone shows of the question itself when the host turned "Mostrar
 * perguntas nos dispositivos" on (spec 012, RN-18 to RN-20): the statement,
 * the image and the time. Which answer is right is never here.
 */

/** The white strip with the statement, as on the host's screen. */
export function Statement({
	text,
	formatting,
}: {
	text: string;
	formatting: TextFormatting;
}) {
	return (
		<h1 className="w-full break-words rounded-md bg-white px-3 py-2 text-center text-lg text-neutral-900 leading-snug shadow-lg sm:text-2xl">
			<FormattedText text={text} formatting={formatting} />
		</h1>
	);
}

/** The opening of a question: its statement and the reading time (RN-18a). */
export function DeviceQuestionIntro({
	stage,
	text,
	formatting,
	receivedAt,
}: {
	stage: PlayerStageData;
	text: string;
	formatting: TextFormatting;
	receivedAt: number;
}) {
	const { ms } = useCountdown(stage.remainingMs, receivedAt);
	const duration = stage.durationMs ?? 1;
	const elapsed = Math.min(1, Math.max(0, 1 - (ms ?? 0) / duration));

	return (
		<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-4 motion-safe:animate-stage-in">
			<div className="w-full max-w-2xl motion-safe:animate-pop-in">
				<Statement text={text} formatting={formatting} />
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
 * The question's image behind the whole phone, when the editor set it as the
 * background: as on the host's screen, and as in Kahoot (RN-20).
 */
export function DeviceBackground({ image }: { image: DeviceImage | null }) {
	if (image?.placement !== "background") {
		return null;
	}
	return (
		<div
			data-slot="device-question-background"
			className="absolute inset-0 -z-10"
		>
			<img
				src={image.url}
				alt={image.altText ?? QUESTION_IMAGE_FALLBACK_ALT}
				draggable={false}
				className="size-full object-cover"
			/>
			<div className="absolute inset-0 bg-black/30" />
		</div>
	);
}

/**
 * The answers phase with the question on the phone, laid out as in Kahoot
 * (RN-18b): the image takes the room at the top, and the statement, the
 * buttons (`children`) and the time sit at the bottom, within the thumb's
 * reach. A background image is drawn by `DeviceBackground`, behind it all.
 */
export function DeviceQuestion({
	stage,
	question,
	receivedAt,
	answersInMiddle = false,
	children,
}: {
	stage: PlayerStageData;
	question: PlayerQuestionData;
	receivedAt: number;
	/**
	 * The answer takes the room left and sits in its middle, as a slider does
	 * in Kahoot (spec 032); the image, if any, shares the room above it.
	 */
	answersInMiddle?: boolean;
	/** The answer buttons. */
	children: ReactNode;
}) {
	const media = question.image?.placement === "media" ? question.image : null;

	return (
		<main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col motion-safe:animate-stage-in">
			{/* Whatever is left of the screen: the buttons below keep their size. */}
			<div
				data-slot="device-question-image"
				className={cn(
					"flex min-h-0 flex-1 basis-24 items-center justify-center px-2 pt-1",
					answersInMiddle && !media && "hidden",
				)}
			>
				{media && (
					<QuestionImageView
						image={media}
						url={media.url}
						className="max-h-full rounded-md"
					/>
				)}
			</div>
			{question.text !== null && (
				<div className="shrink-0 px-2 pt-2">
					<Statement
						text={question.text}
						formatting={question.textFormatting}
					/>
				</div>
			)}
			{answersInMiddle ? (
				<div className="flex min-h-0 flex-1 flex-col justify-center">
					{children}
				</div>
			) : (
				children
			)}
			<TimeBar stage={stage} receivedAt={receivedAt} />
		</main>
	);
}

/**
 * The time left to answer, as in Kahoot: a bar that runs out, with the
 * seconds at its end.
 */
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
		<div className="shrink-0 px-2 pb-2">
			<div className="h-6 overflow-hidden rounded-full bg-black/40">
				<div
					className="flex h-full min-w-10 items-center justify-end rounded-full bg-game-accent px-2.5 text-game-accent-fg ring-1 ring-white/30 transition-[width] duration-200 ease-linear"
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
