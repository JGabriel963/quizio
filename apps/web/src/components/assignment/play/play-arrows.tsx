import { cn } from "@quizio/ui/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { QuestionResultData } from "@/lib/api-types";

import { PlayResult } from "./play-result";
import { PLAY_AREA_CLASS } from "./play-stage";

type ArrowScreen = {
	phase: "results" | "scoreboard" | "finished";
	questionIndex: number;
};

const arrowClass =
	"absolute top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg outline-none transition-[transform,background-color] hover:bg-black/75 focus-visible:ring-4 focus-visible:ring-white/70 active:scale-95 disabled:pointer-events-none disabled:opacity-0 motion-safe:animate-pop-in sm:size-12";

/**
 * The participant's arrows (spec 030, RN-12, RN-17), beside the card as in
 * Kahoot (over its edges on a phone): → asks the server for the next
 * screen; ← walks back through the questions already with results, only to
 * look, and → comes back to where the participant is. At the end there is
 * no →: ← reviews every question from the last.
 */
export function PlayArrows({
	screen,
	history,
	questionCount,
	busy,
	onAdvance,
	children,
}: {
	screen: ArrowScreen;
	history: QuestionResultData[];
	questionCount: number;
	busy: boolean;
	onAdvance: () => void;
	/** The screen the participant is on. */
	children: ReactNode;
}) {
	const at = `${screen.phase}:${screen.questionIndex}`;
	const [back, setBack] = useState({ at, steps: 0 });
	// A new screen from the server starts with nothing reviewed.
	const steps = back.at === at ? back.steps : 0;
	const reviewable = history.filter(({ question }) =>
		screen.phase === "results"
			? question.index < screen.questionIndex
			: question.index <= screen.questionIndex,
	);
	const reviewing = steps > 0 ? reviewable[reviewable.length - steps] : null;
	const finished = screen.phase === "finished";

	return (
		<div className={PLAY_AREA_CLASS}>
			{reviewing ? (
				<PlayResult
					key={reviewing.question.index}
					result={reviewing}
					questionCount={questionCount}
					animate={false}
				/>
			) : (
				children
			)}
			<button
				type="button"
				aria-label="Anterior"
				disabled={steps >= reviewable.length}
				onClick={() => setBack({ at, steps: steps + 1 })}
				className={cn(arrowClass, "left-0 sm:left-2")}
			>
				<ArrowLeftIcon aria-hidden="true" className="size-5 stroke-3" />
			</button>
			{(!finished || reviewing) && (
				<button
					type="button"
					aria-label="Próximo"
					disabled={!reviewing && busy}
					onClick={() =>
						reviewing ? setBack({ at, steps: steps - 1 }) : onAdvance()
					}
					className={cn(arrowClass, "right-0 sm:right-2")}
				>
					<ArrowRightIcon aria-hidden="true" className="size-5 stroke-3" />
				</button>
			)}
		</div>
	);
}
