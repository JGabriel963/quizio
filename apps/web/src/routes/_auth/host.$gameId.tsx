import {
	type AnswerCountPayload,
	GAME_EVENTS,
	type GameEndedPayload,
	gameChannel,
	type LockChangedPayload,
	type PlayerJoinedPayload,
	type PlayerRemovedPayload,
	type StageChangedPayload,
} from "@quizio/core/game/domain/game-events";
import type { StageRef } from "@quizio/core/game/domain/game-progress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { ConnectionLostDialog } from "@/components/game/host/connection-lost-dialog";
import { GameUnavailable } from "@/components/game/host/game-unavailable";
import { HostLobby } from "@/components/game/host/host-lobby";
import { HostStage } from "@/components/game/host/host-stage";
import { Podium } from "@/components/game/host/podium";
import type { GameOptionsData, HostGameData } from "@/lib/api-types";
import { isConnectionFailure, withTimeout } from "@/lib/connection";
import {
	gameErrorCode,
	gameErrorMessage,
	settingErrorMessage,
} from "@/lib/game-error-messages";
import { applyLobbyEvent, type LobbyEvent } from "@/lib/game-lobby";
import { usePlayAgain } from "@/lib/game-mutations";
import { applyAnswerCount, showsStage } from "@/lib/game-stage";
import { useRealtimeEvent } from "@/lib/realtime";
import { useConnectionWatch } from "@/lib/use-connection-watch";
import { useHostSignal } from "@/lib/use-host-signal";
import { useLeaveWarning } from "@/lib/use-leave-warning";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC, useTRPCClient } from "@/utils/trpc";

/** The host's screen of a live game, full screen outside the creator shell (specs 008 to 013). */
export const Route = createFileRoute("/_auth/host/$gameId")({
	component: HostPage,
});

/** Events are hints; the game is asked again this often (ADR 0009). */
const LOBBY_REFETCH_INTERVAL_MS = 15_000;
/** Phases are short: a screen that missed an event catches up sooner (spec 009, RN-33). */
const PLAYING_REFETCH_INTERVAL_MS = 5_000;

/** Refusals that are just the game having moved on: the screen asks again, without a toast. */
const QUIET_REFUSALS = ["GAME.STAGE_NOT_DUE", "GAME.ENDED"];

function HostPage() {
	const { gameId } = Route.useParams();
	const trpc = useTRPC();
	const client = useTRPCClient();
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const origin = useOrigin();

	const viewKey = trpc.game.view.queryKey({ gameId });
	const view = useQuery({
		...trpc.game.view.queryOptions({ gameId }),
		staleTime: 0,
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			// A game that is over does not change anymore (spec 011, RN-07).
			if (status === "finished" || status === "ended") {
				return false;
			}
			return status === "playing"
				? PLAYING_REFETCH_INTERVAL_MS
				: LOBBY_REFETCH_INTERVAL_MS;
		},
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" && failureCount < 2,
		// "Not found" is a page state here, not an unexpected failure.
		meta: { suppressErrorToast: true },
	});

	/** What the server just said is the whole view, as of now. */
	const show = (next: HostGameData) =>
		queryClient.setQueryData<HostGameData>(viewKey, next);
	/**
	 * An event changes part of the view. The view's age stays the same: the
	 * countdowns count from when the server last told the time left.
	 */
	const apply = (change: (current: HostGameData) => HostGameData) =>
		queryClient.setQueryData<HostGameData>(
			viewKey,
			(current) => (current ? change(current) : current),
			{ updatedAt: queryClient.getQueryState(viewKey)?.dataUpdatedAt },
		);
	const applyLobby = (event: LobbyEvent) =>
		apply((current) => applyLobbyEvent(current, event));
	const refresh = () => queryClient.invalidateQueries({ queryKey: viewKey });

	// The screen tells the server it is there, and the answer is also how it
	// knows it has a connection (spec 013). Back from a loss, it asks about the
	// game again: it may have been ended meanwhile (RN-13).
	const status = view.data?.status;
	const signal = () => withTimeout(client.game.signal.mutate({ gameId }));
	const watch = useConnectionWatch({
		enabled: status !== undefined && status !== "ended",
		probe: signal,
		onBack: () => void refresh(),
	});
	// The podium waits for nobody: no signal there (RN-19).
	useHostSignal({
		enabled: (status === "lobby" || status === "playing") && !watch.lost,
		signal,
		report: watch.report,
	});
	const { report } = watch;
	const viewError = view.error;
	useEffect(() => {
		if (viewError) {
			report(viewError);
		}
	}, [viewError, report]);

	const channel = gameChannel(gameId);
	// With autoplay, who is in the lobby moves its countdown, which is the
	// server's (spec 014, RN-06, RN-07): the list changes at once, and the
	// game is asked about again for the time.
	const recount = () => {
		if (queryClient.getQueryData<HostGameData>(viewKey)?.options.autoplay) {
			void refresh();
		}
	};
	useRealtimeEvent<PlayerJoinedPayload>(
		channel,
		GAME_EVENTS.playerJoined,
		({ player }) => {
			applyLobby({ type: "playerJoined", player });
			recount();
		},
	);
	useRealtimeEvent<PlayerRemovedPayload>(
		channel,
		GAME_EVENTS.playerRemoved,
		({ playerId }) => {
			applyLobby({ type: "playerRemoved", playerId });
			recount();
		},
	);
	useRealtimeEvent<LockChangedPayload>(
		channel,
		GAME_EVENTS.lockChanged,
		({ locked }) => applyLobby({ type: "lockChanged", locked }),
	);
	useRealtimeEvent<GameEndedPayload>(
		channel,
		GAME_EVENTS.gameEnded,
		({ reason }) => applyLobby({ type: "gameEnded", reason }),
	);
	// The event carries only the public stage: the rest comes from the query.
	useRealtimeEvent<StageChangedPayload>(
		channel,
		GAME_EVENTS.stageChanged,
		(event) => {
			const current = queryClient.getQueryData<HostGameData>(viewKey);
			if (!current || !showsStage(current, event)) {
				void refresh();
			}
		},
	);
	useRealtimeEvent<AnswerCountPayload>(
		channel,
		GAME_EVENTS.answerCount,
		(event) => apply((current) => applyAnswerCount(current, event)),
	);

	// The host's own actions show at once; a failure is told and brings the
	// server's state back. One for lack of a connection also opens the dialog
	// (spec 013): the host asked for something, so they are told it did not go.
	const failed = (error: unknown) => {
		toast.error(gameErrorMessage(error));
		report(error);
		void refresh();
	};
	const setLocked = useMutation(
		trpc.game.setLocked.mutationOptions({
			networkMode: "always",
			onMutate: ({ locked }) =>
				void applyLobby({ type: "lockChanged", locked }),
			onError: failed,
		}),
	);
	// A switch of the settings: it shows at once and goes back if it fails
	// (spec 012, RN-04). The answer only confirms the options: the stage it
	// carries may be older than the one an advance has just shown.
	const setOptions = useMutation(
		trpc.game.setOptions.mutationOptions({
			networkMode: "always",
			onMutate: ({ options }) =>
				void applyLobby({ type: "optionsChanged", options }),
			onSuccess: ({ options }, { options: asked }) => {
				applyLobby({ type: "optionsChanged", options });
				// Autoplay's countdowns are the server's: the game is asked about
				// again for them (spec 014, RN-08, RN-15).
				if (asked.autoplay !== undefined) {
					void refresh();
				}
			},
			onError: (error) => {
				toast.error(settingErrorMessage(error));
				report(error);
				void refresh();
			},
			meta: { suppressErrorToast: true },
		}),
	);
	const removePlayer = useMutation(
		trpc.game.removePlayer.mutationOptions({
			networkMode: "always",
			onMutate: ({ playerId }) =>
				void applyLobby({ type: "playerRemoved", playerId }),
			onSuccess: recount,
			onError: failed,
		}),
	);
	const end = useMutation(
		trpc.game.end.mutationOptions({
			networkMode: "always",
			onError: failed,
		}),
	);
	const start = useMutation(
		trpc.game.start.mutationOptions({ networkMode: "always" }),
	);
	const advance = useMutation(
		trpc.game.advance.mutationOptions({ networkMode: "always" }),
	);
	const playAgain = usePlayAgain();

	// From the lobby to the podium the host's screen is the game: closing the
	// tab by accident would leave the players without it, so the browser asks
	// first, as Kahoot does. A game that was ended has nothing left to lose.
	useLeaveWarning(
		status === "lobby" || status === "playing" || status === "finished",
	);

	/**
	 * "Iniciar", or autoplay's countdown running out (`auto`, spec 014). The
	 * server may say the countdown is not over: a player joined at the last
	 * moment. The screen then asks about the game again, without a notice.
	 */
	async function startGame(auto = false) {
		try {
			show(await start.mutateAsync({ gameId, auto }));
		} catch (error) {
			if (gameErrorCode(error) === "GAME.STAGE_NOT_DUE") {
				void refresh();
			} else if (auto && isConnectionFailure(error)) {
				// Nobody asked: the dialog tells, and the start is asked for again
				// when the connection is back (RN-19).
				report(error);
			} else {
				failed(error);
			}
			throw error;
		}
	}

	/** The answer is the game after the transition; a refusal goes back to the screen that asked. */
	async function advanceFrom(from: StageRef, skip: boolean) {
		try {
			show(await advance.mutateAsync({ gameId, from, skip }));
		} catch (error) {
			const code = gameErrorCode(error);
			if (isConnectionFailure(error)) {
				// The stage is asked for again when the connection is back (RN-11).
				report(error);
			} else if (code !== "GAME.STAGE_NOT_DUE") {
				if (!code || !QUIET_REFUSALS.includes(code)) {
					toast.error(gameErrorMessage(error));
				}
				void refresh();
			}
			throw error;
		}
	}

	// The lobby shows the address and a QR code of it: it waits for the origin.
	if (view.isPending || origin === null) {
		return <GameUnavailable state={{ kind: "loading", origin }} />;
	}
	// A screen that already has the game keeps it when asking again fails: the
	// dialog over it tells about the connection (spec 013).
	const game = view.data;
	if (!game) {
		return (
			<GameUnavailable
				state={
					view.error?.data?.code === "NOT_FOUND"
						? { kind: "not-found" }
						: { kind: "error", onRetry: () => void view.refetch() }
				}
			/>
		);
	}

	const { quizId } = game;
	if (game.status === "ended") {
		return <GameUnavailable state={{ kind: "ended", quizId }} />;
	}
	const toQuiz = () => navigate({ to: "/quizzes/$quizId", params: { quizId } });
	const connectionLost = <ConnectionLostDialog watch={watch} />;
	if (game.status === "finished" && game.final) {
		return (
			<>
				<Podium
					game={game}
					final={game.final}
					receivedAt={view.dataUpdatedAt}
					playingAgain={playAgain.pending}
					playAgainError={playAgain.error}
					actions={{
						playAgain: () => playAgain.start(quizId),
						report: () =>
							navigate({ to: "/reports/$gameId", params: { gameId } }),
						exit: toQuiz,
					}}
				/>
				{connectionLost}
			</>
		);
	}

	const endGame = () => end.mutate({ gameId }, { onSuccess: toQuiz });
	const settings = {
		setLocked: (locked: boolean) => setLocked.mutate({ gameId, locked }),
		setOptions: (options: Partial<GameOptionsData>) =>
			setOptions.mutate({ gameId, options }),
	};

	if (game.status === "playing" && game.stage) {
		return (
			<>
				<HostStage
					game={game}
					stage={game.stage}
					origin={origin}
					receivedAt={view.dataUpdatedAt}
					connected={!watch.lost}
					actions={{ advance: advanceFrom, end: endGame, ...settings }}
				/>
				{connectionLost}
			</>
		);
	}

	return (
		<>
			<HostLobby
				lobby={game}
				origin={origin}
				receivedAt={view.dataUpdatedAt}
				connected={!watch.lost}
				starting={start.isPending}
				actions={{
					...settings,
					removePlayer: (playerId) => removePlayer.mutate({ gameId, playerId }),
					start: startGame,
					end: endGame,
				}}
			/>
			{connectionLost}
		</>
	);
}
