import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { useTRPC } from "@/utils/trpc";

import { playAgainErrorMessage } from "./game-error-messages";

/** What "Prepare-se para participar" is showing (spec 008, RN-13). */
export type OpeningGameState =
	| { kind: "idle" }
	| { kind: "opening" }
	| { kind: "failed" };

/**
 * "Organizar ao vivo", from the quiz page and from "O quiz está pronto":
 * creates the game and leads to its lobby.
 */
export function useHostGame(quizId: string | null): {
	state: OpeningGameState;
	/** The hook's quiz, or another one, as the library rows ask (spec 029, RN-02). */
	start: (otherQuizId?: string) => void;
	cancel: () => void;
} {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const [state, setState] = useState<OpeningGameState>({ kind: "idle" });
	const host = useMutation(
		trpc.game.host.mutationOptions({
			networkMode: "always",
		}),
	);

	const [lastQuizId, setLastQuizId] = useState(quizId);
	const start = useCallback(
		(otherQuizId?: string) => {
			const target = otherQuizId ?? lastQuizId ?? quizId;
			if (!target) {
				return;
			}
			setLastQuizId(target);
			setState({ kind: "opening" });
			host.mutate(
				{ quizId: target },
				{
					onSuccess: ({ gameId }) =>
						navigate({ to: "/host/$gameId", params: { gameId } }),
					onError: () => setState({ kind: "failed" }),
				},
			);
		},
		[host.mutate, navigate, quizId, lastQuizId],
	);

	const cancel = useCallback(() => setState({ kind: "idle" }), []);

	return { state, start, cancel };
}

/**
 * "Jogar novamente", from the podium: a new game of the same quiz, with
 * another PIN and nobody in it yet (spec 011, RN-15, RN-16).
 */
export function usePlayAgain(): {
	pending: boolean;
	error: string | null;
	start: (quizId: string) => void;
} {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const host = useMutation(
		trpc.game.host.mutationOptions({
			networkMode: "always",
			// The podium tells why; the global toast would say it twice.
			meta: { suppressErrorToast: true },
		}),
	);

	const start = useCallback(
		(quizId: string) => {
			setError(null);
			host.mutate(
				{ quizId },
				{
					onSuccess: ({ gameId }) =>
						navigate({ to: "/host/$gameId", params: { gameId } }),
					onError: (failure) => setError(playAgainErrorMessage(failure)),
				},
			);
		},
		[host.mutate, navigate],
	);

	return { pending: host.isPending, error, start };
}
