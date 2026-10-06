import type { StageRef } from "@quizio/core/game/domain/game-progress";
import { useEffect, useEffectEvent, useState } from "react";

import type {
	GameOptionsData,
	HostGameData,
	HostStageData,
} from "@/lib/api-types";
import { gameErrorCode } from "@/lib/game-error-messages";
import { msLeft, useSteadyTimeLeft } from "@/lib/use-countdown";

import { GameScreen } from "../game-screen";
import { GameHeader } from "./game-header";
import { GameSettings } from "./game-settings";
import { EndGameDialog } from "./lobby-dialogs";
import { Scoreboard } from "./scoreboard";
import { StageBackground } from "./stage-image";
import { Answering, GameIntro, QuestionIntro, Results } from "./stage-screens";

/** What the game screen asks of the API; the route wires it to tRPC (spec 009). */
export interface HostStageActions {
	/**
	 * Asks for the stage after `from`. Rejects with the API's error when the
	 * server refuses, so a request made a moment too early can be repeated.
	 */
	advance: (from: StageRef, skip: boolean) => Promise<unknown>;
	/** "Bloquear jogo", which also works during the game (spec 012, RN-09). */
	setLocked: (locked: boolean) => void;
	/** A switch of the settings: only the option that changed (spec 012). */
	setOptions: (change: Partial<GameOptionsData>) => void;
	end: () => void;
}

/** How long to wait before asking again when the server says it is too early. */
export const ADVANCE_RETRY_MS = 250;

/**
 * The host's projected screen while the game is being played (spec 009, RN-05
 * to RN-13). It is what drives the game: when a phase's time is up, it asks
 * the server for the next one. The server decides; this only asks.
 */
export function HostStage({
	game,
	stage: told,
	origin,
	receivedAt: toldAt,
	connected = true,
	actions,
}: {
	game: HostGameData;
	stage: HostStageData;
	/** The site's origin: the header tells late players where to get in (spec 012, RN-11). */
	origin: string;
	/** When `game` arrived, by this device's clock: the countdowns start from it. */
	receivedAt: number;
	/**
	 * Whether the screen reaches the server (spec 013). Without it nothing is
	 * asked; once back, the stage that ran out meanwhile is asked for at once.
	 */
	connected?: boolean;
	actions: HostStageActions;
}) {
	const [ending, setEnding] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	/** The stage a manual request (skip, advance) was made from, while it is pending. */
	const [pending, setPending] = useState<string | null>(null);

	const { questionIndex, phase, question } = told;
	const stageKey = `${questionIndex}:${phase}`;
	// With autoplay the results and the scoreboard have a countdown too (spec
	// 014). It is named by its token: turned off and on again, it starts over.
	const auto = told.remainingMs === null ? told.autoAdvance : null;
	// The screen asks about the game every few seconds: the countdown of the
	// stage it is showing goes on from where it is, instead of jumping back by
	// the time each answer took to arrive (spec 012).
	const { remainingMs, receivedAt } = useSteadyTimeLeft(
		auto ? `${stageKey}:${auto.token}` : stageKey,
		told.remainingMs ?? auto?.remainingMs ?? null,
		toldAt,
	);
	// The stage's own time stays what the server said it is: none in the results.
	const stage = {
		...told,
		remainingMs: told.remainingMs === null ? null : remainingMs,
	};
	const countdown =
		auto && remainingMs !== null ? { remainingMs, receivedAt } : null;

	const advance = useEffectEvent((skip: boolean) =>
		actions.advance({ questionIndex, phase }, skip),
	);

	// A phase with a deadline ends by itself: this screen asks when it is due.
	useEffect(() => {
		if (remainingMs === null || !connected) {
			return;
		}
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout>;
		const ask = () => {
			advance(false).catch((error: unknown) => {
				// The device's clock ran a little ahead of the server's.
				if (!cancelled && gameErrorCode(error) === "GAME.STAGE_NOT_DUE") {
					timer = setTimeout(ask, ADVANCE_RETRY_MS);
				}
			});
		};
		timer = setTimeout(ask, msLeft(remainingMs, receivedAt, Date.now()));
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
		// A new stage always comes with a new `receivedAt`, which restarts the
		// wait; so does the connection coming back (RN-11).
	}, [remainingMs, receivedAt, connected]);

	function request(skip: boolean) {
		setPending(stageKey);
		actions
			.advance({ questionIndex, phase }, skip)
			.catch(() => {})
			.finally(() => setPending(null));
	}
	const busy = pending === stageKey;

	return (
		<GameScreen className="relative flex h-svh flex-col overflow-hidden">
			{(phase === "answering" || phase === "results") && (
				<StageBackground image={question?.image ?? null} />
			)}
			<GameHeader
				playerCount={game.players.length}
				onExit={() => setEnding(true)}
				join={{ origin, pin: game.pin, locked: game.locked }}
				onOpenSettings={() => setSettingsOpen(true)}
			/>

			{phase === "scoreboard" ? (
				<Scoreboard
					// Each question's scoreboard plays its own animation.
					key={questionIndex}
					entries={stage.scoreboard ?? []}
					leavers={stage.scoreboardLeavers ?? []}
					auto={countdown}
					busy={busy}
					onAdvance={() => request(false)}
				/>
			) : (
				(phase === "gameIntro" || !question) && <GameIntro title={game.title} />
			)}
			{phase === "questionIntro" && question && (
				<QuestionIntro
					stage={stage}
					question={question}
					questionCount={game.questionCount}
					receivedAt={receivedAt}
				/>
			)}
			{phase === "answering" && question && (
				<Answering
					stage={stage}
					question={question}
					receivedAt={receivedAt}
					busy={busy}
					onSkip={() => request(true)}
				/>
			)}
			{phase === "results" && question && (
				<Results
					stage={stage}
					question={question}
					auto={countdown}
					busy={busy}
					onAdvance={() => request(false)}
				/>
			)}

			{/* Over the screen, which keeps asking for the next stage behind it (RN-02). */}
			<GameSettings
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				options={game.options}
				locked={game.locked}
				playing
				onOptionsChange={actions.setOptions}
				onLockedChange={actions.setLocked}
				onEnd={actions.end}
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
