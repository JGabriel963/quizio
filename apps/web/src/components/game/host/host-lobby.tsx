import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import type {
	GameOptionsData,
	HostGameData,
	LobbyPlayerData,
} from "@/lib/api-types";
import { gameErrorCode } from "@/lib/game-error-messages";
import { msLeft, useSteadyTimeLeft } from "@/lib/use-countdown";

import { GameScreen, Wordmark } from "../game-screen";
import { AutoCountdown } from "./auto-countdown";
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
	/**
	 * "Iniciar": the game leaves the lobby (spec 009, RN-01). `auto` is
	 * autoplay's countdown running out (spec 014): the server checks it, and
	 * the promise rejects with its error when it is not time yet.
	 */
	start: (auto?: boolean) => Promise<unknown>;
	removePlayer: (playerId: string) => void;
	end: () => void;
}

const LOCK_TIP = "Bloqueie o jogo para impedir que outros participantes entrem";
/** How long to wait before asking again when the server says it is too early to start. */
export const START_RETRY_MS = 250;

const UNLOCK_TIP = "Desbloqueie o jogo para que outros participantes entrem";

/** The host's projected screen before the game starts (spec 008, RN-14 to RN-31). */
export function HostLobby({
	lobby,
	origin,
	receivedAt: toldAt,
	connected = true,
	actions,
	starting = false,
}: {
	lobby: HostGameData;
	origin: string;
	/** When `lobby` arrived, by this device's clock: the countdown starts from it. */
	receivedAt: number;
	/** Whether the screen reaches the server (spec 013): without it nothing is asked. */
	connected?: boolean;
	actions: HostLobbyActions;
	/** Iniciar was pressed and the server has not answered yet. */
	starting?: boolean;
}) {
	const [removing, setRemoving] = useState<LobbyPlayerData | null>(null);
	const [ending, setEnding] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	// Autoplay's countdown to start (spec 014, RN-05). Asked about again, the
	// same countdown goes on from what the screen shows; another one (a player
	// joined, the switch was turned) starts over, even if it ends later.
	const told = lobby.autoStart;
	const { remainingMs, receivedAt } = useSteadyTimeLeft(
		`lobby:${told?.token ?? "none"}`,
		told?.remainingMs ?? null,
		toldAt,
	);
	const startByItself = useEffectEvent(() => actions.start(true));
	// The screen asks for the start when the countdown is over; the server
	// decides. A lost connection waits, and asks on the way back (RN-19).
	useEffect(() => {
		if (remainingMs === null || !connected) {
			return;
		}
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout>;
		const ask = () => {
			startByItself().catch((error: unknown) => {
				// The device's clock ran a little ahead of the server's.
				if (!cancelled && gameErrorCode(error) === "GAME.STAGE_NOT_DUE") {
					timer = setTimeout(ask, START_RETRY_MS);
				}
			});
		};
		timer = setTimeout(ask, msLeft(remainingMs, receivedAt, Date.now()));
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [remainingMs, receivedAt, connected]);

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
						// A failure is told by whoever wired the action.
						onStart={() => void actions.start().catch(() => {})}
						countdown={
							remainingMs === null ? null : { remainingMs, receivedAt }
						}
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
 * Iniciar needs at least one player (spec 009, RN-01). With autoplay, the
 * countdown to start sits beside it, and Iniciar still works (spec 014, RN-09).
 */
function LobbyControls({
	locked,
	onToggleLock,
	canStart,
	onStart,
	countdown,
}: {
	locked: boolean;
	onToggleLock: () => void;
	canStart: boolean;
	onStart: () => void;
	countdown: { remainingMs: number; receivedAt: number } | null;
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
			{countdown && (
				<AutoCountdown
					label="Inicia em"
					remainingMs={countdown.remainingMs}
					receivedAt={countdown.receivedAt}
				/>
			)}
		</div>
	);
}
