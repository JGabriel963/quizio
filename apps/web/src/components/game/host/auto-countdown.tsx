import { useId } from "react";

import { useCountdown } from "@/lib/use-countdown";

/**
 * Autoplay's countdown on the host's screen (spec 014): the seconds left for
 * the lobby to start, or for the results and the scoreboard to move on. The
 * time is the server's: it goes on from where it is after a reload.
 */
export function AutoCountdown({
	label,
	remainingMs,
	receivedAt,
}: {
	/** What it counts to. */
	label: "Inicia em" | "Avança em";
	/** As the server told it, by its own clock. */
	remainingMs: number;
	/** When that arrived, by this device's clock. */
	receivedAt: number;
}) {
	const unitId = useId();
	const { seconds } = useCountdown(remainingMs, receivedAt);

	return (
		<p
			role="timer"
			aria-label={label}
			aria-describedby={unitId}
			className="flex h-10 min-w-14 items-center justify-center rounded-md bg-black/60 px-3 font-black text-2xl text-white tabular-nums"
		>
			<span
				// Each second makes the number pop.
				key={seconds}
				data-slot="auto-countdown-seconds"
				className="motion-safe:animate-pop-in"
			>
				{seconds}
			</span>
			<span id={unitId} className="sr-only">
				segundos
			</span>
		</p>
	);
}
