import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { useState } from "react";

import type {
	GameOptionsData,
	HostGameData,
	LobbyPlayerData,
} from "@/lib/api-types";

import { GameScreen, Wordmark } from "../game-screen";
import { GameHeader } from "./game-header";
import { GameSettings } from "./game-settings";
import { JoinInstructions } from "./join-instructions";
import { EndGameDialog, RemovePlayerDialog } from "./lobby-dialogs";
import { PlayerGrid } from "./player-grid";

/** What the lobby asks of the API; the route wires it to tRPC (spec 008). */
export interface HostLobbyActions {
	setLocked: (locked: boolean) => void;
	/** A switch of the settings: only the option that changed (spec 012). */
	setOptions: (change: Partial<GameOptionsData>) => void;
	/** "Iniciar": the game leaves the lobby (spec 009, RN-01). */
	start: () => void;
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
	starting = false,
}: {
	lobby: HostGameData;
	origin: string;
	actions: HostLobbyActions;
	/** Iniciar was pressed and the server has not answered yet. */
	starting?: boolean;
}) {
	const [removing, setRemoving] = useState<LobbyPlayerData | null>(null);
	const [ending, setEnding] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<GameScreen className="flex flex-col">
			<GameHeader
				playerCount={lobby.players.length}
				onExit={() => setEnding(true)}
				onOpenSettings={() => setSettingsOpen(true)}
			/>

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
						canStart={lobby.players.length > 0 && !starting}
						onStart={actions.start}
					/>
				</div>

				<h1 className="text-center">
					<Wordmark className="text-5xl sm:text-7xl" />
					<span className="sr-only"> — {lobby.title}</span>
				</h1>

				<PlayerGrid players={lobby.players} onRemove={setRemoving} />
			</main>

			<GameSettings
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				options={lobby.options}
				locked={lobby.locked}
				playing={false}
				onOptionsChange={actions.setOptions}
				onLockedChange={actions.setLocked}
				onEnd={actions.end}
			/>
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

/**
 * The padlock and Iniciar, side by side as in Kahoot (spec 008, RN-23).
 * Iniciar needs at least one player (spec 009, RN-01).
 */
function LobbyControls({
	locked,
	onToggleLock,
	canStart,
	onStart,
}: {
	locked: boolean;
	onToggleLock: () => void;
	canStart: boolean;
	onStart: () => void;
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
			<Button variant="secondary" disabled={!canStart} onClick={onStart}>
				Iniciar
			</Button>
		</div>
	);
}
