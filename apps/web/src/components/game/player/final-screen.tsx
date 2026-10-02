import { Button } from "@quizio/ui/components/button";
import { DrumIcon } from "lucide-react";
import { useState } from "react";

import type { PlayerFinalData } from "@/lib/api-types";
import { finalMessage } from "@/lib/game-stage";
import { useCountdown } from "@/lib/use-countdown";

import { Confetti } from "../confetti";
import { Medal } from "../medal";
import { Centered, PlayerFrame } from "./player-frame";

/**
 * The end of the game on the player's device (spec 011, RN-18 to RN-23).
 * While the podium is being revealed on the host's screen the device waits;
 * then it shows the place the player finished in, with the medal up to third.
 * `final` is null when the end came by event and the session is on its way.
 */
export function FinalScreen({
	nickname,
	final,
	receivedAt,
	onLeave,
}: {
	nickname: string;
	final: PlayerFinalData | null;
	/** When `final` arrived, by this device's clock: the wait counts from it. */
	receivedAt: number;
	/** "Entrar em outro jogo": back to the PIN. */
	onLeave: () => void;
}) {
	const { ms } = useCountdown(final?.revealRemainingMs ?? null, receivedAt);
	// A final screen opened after the reveal just shows: no entrance, no confetti.
	const [live] = useState(() => !final || final.revealRemainingMs > 0);

	if (!final || (ms ?? 0) > 0) {
		return (
			<PlayerFrame nickname={nickname} total={final?.total ?? null}>
				<Centered key="drumroll">
					<DrumIcon
						aria-hidden="true"
						className="size-20 motion-safe:animate-drumroll"
					/>
					<h1 role="status" className="font-black text-4xl">
						Rufem os tambores…
					</h1>
				</Centered>
			</PlayerFrame>
		);
	}

	const message = finalMessage(final.rank);

	return (
		<PlayerFrame nickname={nickname} total={final.total}>
			<Centered key="final">
				<p
					data-slot="quiz-title"
					className="max-w-full break-words rounded-md bg-black/40 px-4 py-1.5 font-bold"
				>
					{final.title}
				</p>
				{message.medal && (
					<>
						<Medal
							place={message.medal}
							className={
								live
									? "size-32 text-7xl motion-safe:animate-pop-in"
									: "size-32 text-7xl"
							}
						/>
						<span className="sr-only">{message.medal}º lugar</span>
					</>
				)}
				<h1 data-slot="final-title" className="font-black text-3xl sm:text-4xl">
					{message.title}
				</h1>
				{message.detail && (
					<p className="font-bold text-xl">{message.detail}</p>
				)}
				<Button variant="secondary" size="lg" onClick={onLeave}>
					Entrar em outro jogo
				</Button>
			</Centered>
			{live && final.rank === 1 && <Confetti />}
		</PlayerFrame>
	);
}
