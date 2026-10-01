import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	LockIcon,
	LockOpenIcon,
	MaximizeIcon,
	MinimizeIcon,
	UserIcon,
	XIcon,
} from "lucide-react";
import { useState } from "react";

import type { HostLobbyData, LobbyPlayerData } from "@/lib/api-types";
import { useFullscreen } from "@/lib/use-fullscreen";

import { GameScreen, Wordmark } from "../game-screen";
import { JoinInstructions } from "./join-instructions";
import { EndGameDialog, RemovePlayerDialog } from "./lobby-dialogs";
import { PlayerGrid } from "./player-grid";

/** What the lobby asks of the API; the route wires it to tRPC (spec 008). */
export interface HostLobbyActions {
	setLocked: (locked: boolean) => void;
	removePlayer: (playerId: string) => void;
	end: () => void;
}

const LOCK_TIP = "Bloqueie o jogo para impedir que outros participantes entrem";
const UNLOCK_TIP = "Desbloqueie o jogo para que outros participantes entrem";

/** The host's projected screen before the game starts (spec 008, RN-14 to RN-31). */
export function HostLobby({
	lobby,
	origin,
	actions,
}: {
	lobby: HostLobbyData;
	origin: string;
	actions: HostLobbyActions;
}) {
	const fullscreen = useFullscreen();
	const [removing, setRemoving] = useState<LobbyPlayerData | null>(null);
	const [ending, setEnding] = useState(false);

	return (
		<GameScreen className="flex flex-col">
			<header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-black/40 px-2">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Sair"
					className="justify-self-start"
					onClick={() => setEnding(true)}
				>
					<XIcon />
				</Button>
				<Wordmark className="text-2xl" />
				<div className="flex items-center gap-1 justify-self-end">
					<p className="flex items-center gap-1.5 px-2 font-bold">
						<UserIcon aria-hidden="true" className="size-4" />
						<span className="sr-only">Jogadores:</span>
						<span data-slot="player-count">{lobby.players.length}</span>
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

			<main className="flex flex-1 flex-col items-center gap-8 p-4 sm:p-6">
				<div className="grid w-full grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_auto_1fr]">
					<div className="lg:col-start-2">
						<JoinInstructions
							origin={origin}
							pin={lobby.pin}
							locked={lobby.locked}
						/>
					</div>
					<LobbyControls
						locked={lobby.locked}
						onToggleLock={() => actions.setLocked(!lobby.locked)}
					/>
				</div>

				<h1 className="text-center">
					<Wordmark className="text-5xl sm:text-7xl" />
					<span className="sr-only"> — {lobby.title}</span>
				</h1>

				<PlayerGrid players={lobby.players} onRemove={setRemoving} />
			</main>

			<RemovePlayerDialog
				player={removing}
				onCancel={() => setRemoving(null)}
				onConfirm={(player) => {
					setRemoving(null);
					actions.removePlayer(player.id);
				}}
			/>
			<EndGameDialog
				open={ending}
				onCancel={() => setEnding(false)}
				onConfirm={() => {
					setEnding(false);
					actions.end();
				}}
			/>
		</GameScreen>
	);
}

/** The padlock and Iniciar, side by side as in Kahoot (RN-22, RN-23). */
function LobbyControls({
	locked,
	onToggleLock,
}: {
	locked: boolean;
	onToggleLock: () => void;
}) {
	const tip = locked ? UNLOCK_TIP : LOCK_TIP;

	return (
		<div className="flex items-center gap-1 justify-self-center rounded-md bg-black/50 p-1 lg:justify-self-end">
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={tip}
							aria-pressed={locked}
							onClick={onToggleLock}
							className={cn(
								"flex size-10 items-center justify-center rounded outline-none hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-white/60",
								locked && "bg-white text-neutral-800 hover:bg-white/90",
							)}
						/>
					}
				>
					{locked ? (
						<LockIcon aria-hidden="true" className="size-4" />
					) : (
						<LockOpenIcon aria-hidden="true" className="size-4" />
					)}
				</TooltipTrigger>
				<TooltipContent side="bottom">{tip}</TooltipContent>
			</Tooltip>
			{/* Starts working with the question cycle (spec 009). */}
			<Button variant="secondary" disabled className="gap-2">
				Iniciar
				<Badge variant="soon" className="border-neutral-400 text-neutral-600">
					Em breve
				</Badge>
			</Button>
		</div>
	);
}
