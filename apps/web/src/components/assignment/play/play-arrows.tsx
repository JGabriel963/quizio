import { Button } from "@quizio/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { QuestionResultData } from "@/lib/api-types";

import { PlayResult } from "./play-result";

type ArrowScreen = {
	phase: "results" | "scoreboard" | "finished";
	questionIndex: number;
};

/**
 * The participant's arrows (spec 030, RN-12, RN-17): → asks the server for
 * the next screen; ← walks back through the questions already with results,
 * only to look, and → comes back to where the participant is. At the end
 * there is no →: ← reviews every question from the last.
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
		<div className="flex min-h-0 flex-1 flex-col">
			{reviewing ? (
				<PlayResult result={reviewing} questionCount={questionCount} />
			) : (
				children
			)}
			<nav
				aria-label="Navegação"
				className="flex shrink-0 items-center justify-between gap-2 bg-black/30 p-2"
			>
				<Button
					variant="secondary"
					size="icon-lg"
					aria-label="Anterior"
					disabled={steps >= reviewable.length}
					onClick={() => setBack({ at, steps: steps + 1 })}
				>
					<ChevronLeftIcon aria-hidden="true" />
				</Button>
				{(!finished || reviewing) && (
					<Button
						variant="secondary"
						size="icon-lg"
						aria-label="Próximo"
						disabled={!reviewing && busy}
						onClick={() =>
							reviewing ? setBack({ at, steps: steps - 1 }) : onAdvance()
						}
					>
						<ChevronRightIcon aria-hidden="true" />
					</Button>
				)}
			</nav>
		</div>
	);
}
