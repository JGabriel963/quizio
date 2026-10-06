import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ChartColumnIcon, ListOrderedIcon, RotateCcwIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import type { HostFinalData, HostGameData } from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";
import { type PodiumPlace, podiumOf, revealedPlaces } from "@/lib/podium";
import { useCountdown } from "@/lib/use-countdown";

import { Confetti } from "../confetti";
import { GameScreen } from "../game-screen";
import { Medal } from "../medal";
import { FinalStandings } from "./final-standings";
import { GameHeader } from "./game-header";

/** What the podium asks of the route (spec 011, RN-13 to RN-17). */
export interface PodiumActions {
	/** "Jogar novamente": a new game of the same quiz. */
	playAgain: () => void;
	/** "Ver relatório": the report of this game (spec 015, RN-49). */
	report: () => void;
	/** Back to the quiz: the game is over, so nothing is asked (RN-12). */
	exit: () => void;
}

const STEP_HEIGHTS: Record<PodiumPlace, string> = {
	1: "h-44 sm:h-60",
	2: "h-32 sm:h-44",
	3: "h-24 sm:h-32",
};

/**
 * The end of the game on the host's screen: the first three on the podium,
 * shown one at a time from the third to the first, who gets more of a show
 * (spec 011, RN-08 to RN-12, RN-33). The reveal is counted from what the
 * server said was left of it, so a reload goes on from where it is and a
 * podium reopened later just shows, whole.
 */
export function Podium({
	game,
	final,
	receivedAt,
	playingAgain,
	playAgainError,
	actions,
}: {
	game: HostGameData;
	final: HostFinalData;
	/** When `final` arrived, by this device's clock: the reveal counts from it. */
	receivedAt: number;
	playingAgain: boolean;
	playAgainError: string | null;
	actions: PodiumActions;
}) {
	const { ms } = useCountdown(final.revealRemainingMs, receivedAt);
	const remainingMs = ms ?? 0;
	const revealed = revealedPlaces(remainingMs);
	const over = remainingMs === 0;
	// A podium opened after its reveal has nothing to stage: no entrances, no
	// confetti. The same goes for coming back to it from the standings.
	const [live, setLive] = useState(() => final.revealRemainingMs > 0);
	const [showingStandings, setShowingStandings] = useState(false);
	const openStandings = () => {
		setLive(false);
		setShowingStandings(true);
	};

	return (
		<GameScreen className="relative flex h-svh flex-col overflow-hidden">
			<GameHeader playerCount={game.players.length} onExit={actions.exit} />

			{showingStandings ? (
				<FinalStandings
					standings={final.standings}
					onBack={() => setShowingStandings(false)}
				/>
			) : (
				<main className="relative flex min-h-0 flex-1 flex-col items-center gap-4 p-4 sm:p-6">
					<h1 className="max-w-4xl break-words rounded-md bg-white px-6 py-3 text-center font-bold text-2xl text-neutral-900 shadow-lg sm:text-4xl">
						{game.title}
					</h1>

					<ol
						aria-label="Pódio"
						className="flex min-h-0 w-full max-w-3xl flex-1 items-end justify-center gap-2 sm:gap-4"
					>
						{podiumOf(final.standings).map(({ place, standing }) => {
							const shown = standing !== null && revealed.includes(place);
							return (
								<li
									key={place}
									data-slot="podium-step"
									data-place={place}
									data-revealed={shown}
									aria-label={
										shown
											? `${place}º lugar: ${standing.nickname}, ${standing.total} pontos`
											: `${place}º lugar`
									}
									className="flex min-w-0 flex-1 flex-col items-center"
								>
									<div className="flex min-h-24 w-full flex-col items-center justify-end pb-3">
										{shown && (
											<motion.div
												initial={
													live
														? {
																opacity: 0,
																y: 80,
																scale: place === 1 ? 0.3 : 0.8,
															}
														: false
												}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												transition={
													place === 1
														? { type: "spring", stiffness: 180, damping: 12 }
														: undefined
												}
												className="flex w-full flex-col items-center gap-1"
											>
												<p
													data-slot="podium-player"
													className={cn(
														"max-w-full truncate rounded-md bg-white/90 px-3 py-1 font-black text-neutral-900 text-xl sm:text-3xl",
														place === 1 && "sm:text-4xl",
													)}
												>
													{standing.nickname}
												</p>
												<p className="font-black text-lg sm:text-2xl">
													<CountUp
														data-slot="podium-total"
														from={live ? 0 : undefined}
														value={standing.total}
													/>
												</p>
											</motion.div>
										)}
									</div>
									<div
										className={cn(
											"flex w-full justify-center rounded-t-md border-white/20 border-t bg-black/35 pt-3 shadow-lg",
											STEP_HEIGHTS[place],
											place === 1 &&
												shown &&
												live &&
												"motion-safe:animate-podium-glow",
										)}
									>
										<Medal place={place} />
									</div>
								</li>
							);
						})}
					</ol>

					<div className="flex min-h-20 flex-col items-center gap-2">
						{over && (
							<div className="flex flex-wrap items-center justify-center gap-3 motion-safe:animate-stage-in">
								<Button variant="game" onClick={openStandings}>
									<ListOrderedIcon aria-hidden="true" />
									Classificação
								</Button>
								<Button
									variant="secondary"
									size="lg"
									disabled={playingAgain}
									onClick={actions.playAgain}
								>
									<RotateCcwIcon aria-hidden="true" />
									Jogar novamente
								</Button>
								<Button variant="game" onClick={actions.report}>
									<ChartColumnIcon aria-hidden="true" />
									Ver relatório
								</Button>
								<Button variant="game" onClick={actions.exit}>
									Voltar ao quiz
								</Button>
							</div>
						)}
						{playAgainError && (
							<p role="alert" className="font-bold">
								{playAgainError}
							</p>
						)}
					</div>

					{live && revealed.includes(1) && <Confetti />}
				</main>
			)}
		</GameScreen>
	);
}
