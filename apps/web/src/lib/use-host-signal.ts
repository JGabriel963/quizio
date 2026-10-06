import { HOST_SIGNAL_INTERVAL_MS } from "@quizio/core/game/domain/host-presence";
import { useEffect, useEffectEvent } from "react";

/**
 * While `enabled`, tells the server every few seconds that the host's screen
 * is there (spec 013, RN-14): it is what the players' devices go by to say
 * the host disconnected. What a signal fails with goes to `report`.
 */
export function useHostSignal(options: {
	enabled: boolean;
	signal: () => Promise<unknown>;
	report: (error: unknown) => void;
}): void {
	const { enabled } = options;
	const send = useEffectEvent((isStopped: () => boolean) => {
		options.signal().catch((error: unknown) => {
			if (!isStopped()) {
				options.report(error);
			}
		});
	});

	useEffect(() => {
		if (!enabled) {
			return;
		}
		let stopped = false;
		const isStopped = () => stopped;
		send(isStopped);
		const timer = setInterval(() => send(isStopped), HOST_SIGNAL_INTERVAL_MS);
		return () => {
			stopped = true;
			clearInterval(timer);
		};
	}, [enabled]);
}
