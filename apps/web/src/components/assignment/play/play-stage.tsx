import { cn } from "@quizio/ui/lib/utils";
import type { ReactNode } from "react";

import { Statement } from "@/components/game/player/question-on-device";

/** One segment per question, the ones reached filled, above the card as in Kahoot (RN-08). */
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
			className="mx-auto flex w-full max-w-sm shrink-0 gap-1.5 px-4 py-3"
		>
			{Array.from({ length: count }, (_, segment) => (
				<span
					key={`segment-${segment.toString()}`}
					className={cn(
						"h-1 flex-1 rounded-full transition-colors duration-500",
						segment <= index ? "bg-game-fg" : "bg-game-fg/30",
					)}
				/>
			))}
		</div>
	);
}

/**
 * Where the card sits: the same in a question and in its result, so the card
 * does not change size between them, with room for the arrows beside it.
 */
export const PLAY_AREA_CLASS =
	"relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-2 pb-2 sm:px-16 sm:pb-6";

/**
 * The translucent card every screen of the activity sits in, centered, with
 * room on wide screens for the arrows beside it (spec 030, RN-12).
 */
export function PlayCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			data-slot="play-card"
			className={cn(
				"relative isolate mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-lg bg-white/10 shadow-xl backdrop-blur-sm",
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * A question and its result share this layout, so nothing moves when the
 * answer is sent (as in Kahoot): the top takes what is left (the image, or
 * the result's strip), and the statement, the answers and the time bar keep
 * their place at the bottom.
 */
export function QuestionLayout({
	text,
	top,
	answers,
	footer,
	background,
}: {
	text: string;
	top: ReactNode;
	answers: ReactNode;
	/** The time bar; the same room stays empty without it. */
	footer?: ReactNode;
	/** The question's image behind the whole card. */
	background?: ReactNode;
}) {
	return (
		<PlayCard>
			{background}
			<div className="relative flex min-h-0 flex-1 basis-24 flex-col items-center justify-center px-2 pt-2">
				{top}
			</div>
			<div className="shrink-0 px-2 pt-2">
				<Statement>{text}</Statement>
			</div>
			{answers}
			<div className="flex h-8 shrink-0 items-start px-2">{footer}</div>
		</PlayCard>
	);
}

/** The grid of the answers, the same as the live game's buttons with texts (spec 012). */
export const ANSWER_GRID_CLASS =
	"grid shrink-0 auto-rows-[minmax(clamp(5.5rem,13svh,8.5rem),auto)] grid-cols-2 gap-2";
