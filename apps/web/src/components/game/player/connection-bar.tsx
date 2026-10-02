import { Button } from "@quizio/ui/components/button";
import { CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { GameMotion, usePrefersReducedMotion } from "@/lib/game-motion";

/**
 * Why the game is not reaching the player: the device has no connection, or
 * the host's screen went silent. The device's own comes first: without a
 * connection it cannot know about the host (spec 013, RN-21).
 */
export type ConnectionTrouble = "device" | "host" | null;

const REASON: Record<NonNullable<ConnectionTrouble>, string> = {
	device: "Tentando reconectar…",
	host: "O anfitrião se desconectou",
};

/**
 * "Conexão perdida" at the bottom of the player's screen, over a darker
 * screen that still takes the touches: an answer sent meanwhile counts (spec
 * 013, RN-15 to RN-20). It goes away by itself; "Sair" leads to the PIN.
 *
 * It sits on the bottom edge, over the nickname, so the answers and "Enviar"
 * stay free. That is where the screen's own notice shows, so while the bar is
 * up the notice goes to the top instead.
 */
export function ConnectionBar({
	trouble,
	notice = null,
	onLeave,
}: {
	trouble: ConnectionTrouble;
	/** What the screen would tell at its bottom edge, shown here while the bar is up. */
	notice?: string | null;
	onLeave: () => void;
}) {
	const reduced = usePrefersReducedMotion();

	return (
		<GameMotion>
			<AnimatePresence>
				{trouble && (
					<motion.div
						key="dim"
						data-slot="connection-dim"
						aria-hidden="true"
						className="pointer-events-none fixed inset-0 z-30 bg-black/50"
						initial={reduced ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={reduced ? undefined : { opacity: 0 }}
						transition={{ duration: 0.2 }}
					/>
				)}
				{trouble && (
					<motion.div
						key="bar"
						data-slot="connection-bar"
						data-motion={reduced ? "reduced" : "full"}
						className="fixed inset-x-3 bottom-2 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-md bg-neutral-900 px-4 py-3 text-white shadow-xl"
						initial={reduced ? false : { y: 48, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={reduced ? undefined : { y: 48, opacity: 0 }}
						transition={{ duration: 0.25 }}
					>
						<LoaderCircleIcon
							data-slot="connection-indicator"
							aria-hidden="true"
							className="size-6 shrink-0 motion-safe:animate-spin"
						/>
						<p role="status" className="min-w-0 flex-1 text-sm leading-tight">
							<strong className="block font-bold">Conexão perdida</strong>
							{REASON[trouble]}
						</p>
						<Button variant="secondary" size="sm" onClick={onLeave}>
							Sair
						</Button>
					</motion.div>
				)}
				{trouble && notice && (
					<motion.p
						key="notice"
						role="alert"
						className="fixed inset-x-3 top-16 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-md bg-destructive px-4 py-3 font-semibold text-white shadow-xl"
						initial={reduced ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={reduced ? undefined : { opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<CircleAlertIcon aria-hidden="true" className="size-5 shrink-0" />
						{notice}
					</motion.p>
				)}
			</AnimatePresence>
		</GameMotion>
	);
}
