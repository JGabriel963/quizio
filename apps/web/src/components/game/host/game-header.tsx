import { Button } from "@quizio/ui/components/button";
import { MaximizeIcon, MinimizeIcon, UserIcon, XIcon } from "lucide-react";

import { useFullscreen } from "@/lib/use-fullscreen";

import { Wordmark } from "../game-screen";

/**
 * The bar at the top of the host's screen, in the lobby and during the game:
 * leaving, the player count and full screen (spec 008, RN-21; spec 009, RN-05).
 */
export function GameHeader({
	playerCount,
	onExit,
}: {
	playerCount: number;
	/** "Sair" asks before ending the game. */
	onExit: () => void;
}) {
	const fullscreen = useFullscreen();

	return (
		<header className="relative grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-black/40 px-2">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Sair"
				className="justify-self-start"
				onClick={onExit}
			>
				<XIcon />
			</Button>
			<Wordmark className="text-2xl" />
			<div className="flex items-center gap-1 justify-self-end">
				<p className="flex items-center gap-1.5 px-2 font-bold">
					<UserIcon aria-hidden="true" className="size-4" />
					<span className="sr-only">Jogadores:</span>
					<span data-slot="player-count">{playerCount}</span>
				</p>
				<Button
					variant="ghost"
					size="icon"
					aria-label={fullscreen.active ? "Sair da tela cheia" : "Tela cheia"}
					onClick={fullscreen.toggle}
				>
					{fullscreen.active ? <MinimizeIcon /> : <MaximizeIcon />}
				</Button>
			</div>
		</header>
	);
}
