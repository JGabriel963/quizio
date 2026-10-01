import {
	GAME_EVENTS,
	type GameEndedPayload,
	gameChannel,
	type LockChangedPayload,
	type PlayerJoinedPayload,
	type PlayerRemovedPayload,
} from "@quizio/core/game/domain/game-events";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { GameUnavailable } from "@/components/game/host/game-unavailable";
import { HostLobby } from "@/components/game/host/host-lobby";
import type { HostLobbyData } from "@/lib/api-types";
import { gameErrorMessage } from "@/lib/game-error-messages";
import { applyLobbyEvent, type LobbyEvent } from "@/lib/game-lobby";
import { useRealtimeEvent } from "@/lib/realtime";
import { useTRPC } from "@/utils/trpc";

/** The host's screen of a live game, full screen outside the creator shell (spec 008). */
export const Route = createFileRoute("/_auth/host/$gameId")({
	component: HostPage,
});

/** Events are hints; the lobby is asked again this often (ADR 0009). */
const LOBBY_REFETCH_INTERVAL_MS = 15_000;

function HostPage() {
	const { gameId } = Route.useParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const origin = typeof window === "undefined" ? "" : window.location.origin;

	const lobbyKey = trpc.game.lobby.queryKey({ gameId });
	const lobby = useQuery({
		...trpc.game.lobby.queryOptions({ gameId }),
		staleTime: 0,
		refetchInterval: LOBBY_REFETCH_INTERVAL_MS,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" && failureCount < 2,
		// "Not found" is a page state here, not an unexpected failure.
		meta: { suppressErrorToast: true },
	});

	const apply = (event: LobbyEvent) =>
		queryClient.setQueryData<HostLobbyData>(lobbyKey, (view) =>
			view ? applyLobbyEvent(view, event) : view,
		);
	const refresh = () => queryClient.invalidateQueries({ queryKey: lobbyKey });

	const channel = gameChannel(gameId);
	useRealtimeEvent<PlayerJoinedPayload>(
		channel,
		GAME_EVENTS.playerJoined,
		({ player }) => apply({ type: "playerJoined", player }),
	);
	useRealtimeEvent<PlayerRemovedPayload>(
		channel,
		GAME_EVENTS.playerRemoved,
		({ playerId }) => apply({ type: "playerRemoved", playerId }),
	);
	useRealtimeEvent<LockChangedPayload>(
		channel,
		GAME_EVENTS.lockChanged,
		({ locked }) => apply({ type: "lockChanged", locked }),
	);
	useRealtimeEvent<GameEndedPayload>(
		channel,
		GAME_EVENTS.gameEnded,
		({ reason }) => apply({ type: "gameEnded", reason }),
	);

	// The host's own actions show at once; a refusal brings the server's state back.
	const failed = (error: unknown) => {
		toast.error(gameErrorMessage(error));
		void refresh();
	};
	const setLocked = useMutation(
		trpc.game.setLocked.mutationOptions({
			networkMode: "always",
			onMutate: ({ locked }) => void apply({ type: "lockChanged", locked }),
			onError: failed,
		}),
	);
	const removePlayer = useMutation(
		trpc.game.removePlayer.mutationOptions({
			networkMode: "always",
			onMutate: ({ playerId }) =>
				void apply({ type: "playerRemoved", playerId }),
			onError: failed,
		}),
	);
	const end = useMutation(
		trpc.game.end.mutationOptions({
			networkMode: "always",
			onError: failed,
		}),
	);

	if (lobby.isPending) {
		return <GameUnavailable state={{ kind: "loading", origin }} />;
	}
	if (lobby.isError) {
		return (
			<GameUnavailable
				state={
					lobby.error.data?.code === "NOT_FOUND"
						? { kind: "not-found" }
						: { kind: "error", onRetry: () => void lobby.refetch() }
				}
			/>
		);
	}
	if (lobby.data.status === "ended") {
		return (
			<GameUnavailable state={{ kind: "ended", quizId: lobby.data.quizId }} />
		);
	}

	const { quizId } = lobby.data;
	return (
		<HostLobby
			lobby={lobby.data}
			origin={origin}
			actions={{
				setLocked: (locked) => setLocked.mutate({ gameId, locked }),
				removePlayer: (playerId) => removePlayer.mutate({ gameId, playerId }),
				end: () =>
					end.mutate(
						{ gameId },
						{
							onSuccess: () =>
								navigate({ to: "/quizzes/$quizId", params: { quizId } }),
						},
					),
			}}
		/>
	);
}
