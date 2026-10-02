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
import { toast } from "sonner";

import { GameUnavailable } from "@/components/game/host/game-unavailable";
import { HostLobby } from "@/components/game/host/host-lobby";
import { HostStage } from "@/components/game/host/host-stage";
import { Podium } from "@/components/game/host/podium";
import type { GameOptionsData, HostGameData } from "@/lib/api-types";
import {
	gameErrorCode,
	gameErrorMessage,
	settingErrorMessage,
} from "@/lib/game-error-messages";
import { applyLobbyEvent, type LobbyEvent } from "@/lib/game-lobby";
import { usePlayAgain } from "@/lib/game-mutations";
import { applyAnswerCount, showsStage } from "@/lib/game-stage";
import { useRealtimeEvent } from "@/lib/realtime";
import { useLeaveWarning } from "@/lib/use-leave-warning";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

/** The host's screen of a live game, full screen outside the creator shell (specs 008 to 011). */
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

	const channel = gameChannel(gameId);
	useRealtimeEvent<PlayerJoinedPayload>(
		channel,
		GAME_EVENTS.playerJoined,
		({ player }) => applyLobby({ type: "playerJoined", player }),
	);
	useRealtimeEvent<PlayerRemovedPayload>(
		channel,
		GAME_EVENTS.playerRemoved,
		({ playerId }) => applyLobby({ type: "playerRemoved", playerId }),
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

	// The host's own actions show at once; a refusal brings the server's state back.
	const failed = (error: unknown) => {
		toast.error(gameErrorMessage(error));
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
			onSuccess: ({ options }) =>
				void applyLobby({ type: "optionsChanged", options }),
			onError: (error) => {
				toast.error(settingErrorMessage(error));
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
		trpc.game.start.mutationOptions({
			networkMode: "always",
			onSuccess: show,
			onError: failed,
		}),
	);
	const advance = useMutation(
		trpc.game.advance.mutationOptions({ networkMode: "always" }),
	);
	const playAgain = usePlayAgain();

	// From the lobby to the podium the host's screen is the game: closing the
	// tab by accident would leave the players without it, so the browser asks
	// first, as Kahoot does. A game that was ended has nothing left to lose.
	const status = view.data?.status;
	useLeaveWarning(
		status === "lobby" || status === "playing" || status === "finished",
	);

	/** The answer is the game after the transition; a refusal goes back to the screen that asked. */
	async function advanceFrom(from: StageRef, skip: boolean) {
		try {
			show(await advance.mutateAsync({ gameId, from, skip }));
		} catch (error) {
			const code = gameErrorCode(error);
			if (code !== "GAME.STAGE_NOT_DUE") {
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
	if (view.isError) {
		return (
			<GameUnavailable
				state={
					view.error.data?.code === "NOT_FOUND"
						? { kind: "not-found" }
						: { kind: "error", onRetry: () => void view.refetch() }
				}
			/>
		);
	}

	const game = view.data;
	const { quizId } = game;
	if (game.status === "ended") {
		return <GameUnavailable state={{ kind: "ended", quizId }} />;
	}
	const toQuiz = () => navigate({ to: "/quizzes/$quizId", params: { quizId } });
	if (game.status === "finished" && game.final) {
		return (
			<Podium
				game={game}
				final={game.final}
				receivedAt={view.dataUpdatedAt}
				playingAgain={playAgain.pending}
				playAgainError={playAgain.error}
				actions={{ playAgain: () => playAgain.start(quizId), exit: toQuiz }}
			/>
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
			<HostStage
				game={game}
				stage={game.stage}
				origin={origin}
				receivedAt={view.dataUpdatedAt}
				actions={{ advance: advanceFrom, end: endGame, ...settings }}
			/>
		);
	}

	return (
		<HostLobby
			lobby={game}
			origin={origin}
			starting={start.isPending}
			actions={{
				...settings,
				removePlayer: (playerId) => removePlayer.mutate({ gameId, playerId }),
				start: () => start.mutate({ gameId }),
				end: endGame,
			}}
		/>
	);
}
