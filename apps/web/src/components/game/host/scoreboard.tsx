import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronRightIcon, MoveUpIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import type { ScoreboardEntryData } from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";
import { GAME_MOTION, usePrefersReducedMotion } from "@/lib/game-motion";
import { scoreboardSteps } from "@/lib/scoreboard-animation";

/** How long the scoreboard shows as it was before the points start going up. */
export const SCOREBOARD_HOLD_MS = 600;

/** Roughly a row and its gap: how far below a row that comes in starts. */
const ROW_TRAVEL_PX = 88;

type Step = "before" | "counting" | "after";

/**
 * The scoreboard between questions: the first five by total, the leader in
 * white and an arrow by who climbed (spec 010, RN-17 to RN-21). It opens as it
 * was before the question, the points go up, then the rows slide to their new
 * places (spec 011, RN-28 to RN-32). It stays until the host advances, who
 * never has to wait for the animation (RN-25).
 */
export function Scoreboard({
	entries,
	leavers,
	busy,
	onAdvance,
}: {
	entries: ScoreboardEntryData[];
	/** Who was among the five before the question: their rows go out. */
	leavers: ScoreboardEntryData[];
	busy: boolean;
	onAdvance: () => void;
}) {
	const reduced = usePrefersReducedMotion();
	// The same scoreboard may arrive again from the server: only a different one restarts.
	const signature = JSON.stringify([entries, leavers]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the signature stands for both lists
	const steps = useMemo(() => scoreboardSteps(entries, leavers), [signature]);
	const animated = steps.changed && !reduced;
	const [step, setStep] = useState<Step>(animated ? "before" : "after");

	// biome-ignore lint/correctness/useExhaustiveDependencies: a new scoreboard starts over
	useEffect(() => {
		if (!animated) {
			setStep("after");
			return;
		}
		setStep("before");
		const counting = setTimeout(() => setStep("counting"), SCOREBOARD_HOLD_MS);
		const after = setTimeout(
			() => setStep("after"),
			// With no points to count on screen, the rows move right away.
			SCOREBOARD_HOLD_MS + (steps.counts ? GAME_MOTION.countMs : 0),
		);
		return () => {
			clearTimeout(counting);
			clearTimeout(after);
		};
	}, [animated, steps.counts, signature]);

	const rows = step === "after" ? steps.after : steps.before;

	return (
		<main className="relative flex min-h-0 flex-1 flex-col">
			<div className="flex justify-end p-2 sm:p-4">
				<Button variant="secondary" disabled={busy} onClick={onAdvance}>
					Avançar
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</div>
			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-8">
				<h1 className="sr-only">Placar</h1>
				<ol
					aria-label="Placar"
					data-step={step}
					className="relative flex w-full max-w-3xl flex-col gap-2"
				>
					<AnimatePresence initial={false} mode="popLayout">
						{rows.map((row, index) => (
							<motion.li
								key={row.playerId}
								layout
								initial={{
									opacity: 0,
									y: (rows.length - index) * ROW_TRAVEL_PX,
								}}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: ROW_TRAVEL_PX }}
								data-slot="scoreboard-entry"
								data-leader={index === 0}
								className={cn(
									"flex h-16 items-center gap-4 rounded-md px-5 font-black text-2xl shadow-lg transition-colors duration-500 sm:h-20 sm:text-4xl",
									index === 0
										? "bg-white text-neutral-900"
										: "bg-brand-strong text-white",
								)}
							>
								<span className="min-w-0 flex-1 truncate">{row.nickname}</span>
								<CountUp
									data-slot="scoreboard-total"
									from={row.fromTotal}
									value={row.total}
									start={step !== "before"}
								/>
								<span className="flex size-8 shrink-0 items-center justify-center">
									{row.climbed && (
										<>
											<MoveUpIcon
												data-slot="scoreboard-climbed"
												aria-hidden="true"
												className="size-7 stroke-3 motion-safe:animate-pop-in"
											/>
											<span className="sr-only">subiu de posição</span>
										</>
									)}
								</span>
							</motion.li>
						))}
					</AnimatePresence>
				</ol>
			</div>
		</main>
	);
}
