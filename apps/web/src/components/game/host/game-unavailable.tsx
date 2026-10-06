import { Button, buttonVariants } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";

import { joinAddress } from "@/lib/join-link";

import { GameScreen } from "../game-screen";
import { PreparingLobby } from "../opening-game";

export type GameUnavailableState =
	/** `origin` is null until the browser tells it: the server does not know the address. */
	| { kind: "loading"; origin: string | null }
	| { kind: "not-found" }
	| { kind: "ended"; quizId: string }
	| { kind: "error"; onRetry: () => void };

/** Every state of the host's screen other than an open lobby (spec 008, RN-20, RN-32). */
export function GameUnavailable({ state }: { state: GameUnavailableState }) {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-5 p-4 text-center">
			{state.kind === "loading" && (
				<PreparingLobby
					address={state.origin === null ? null : joinAddress(state.origin)}
				/>
			)}
			{state.kind === "not-found" && (
				<>
					<h1 className="font-bold text-2xl">Partida não encontrada</h1>
					<Link
						to="/library"
						search={{ section: "recent" }}
						className={buttonVariants({ variant: "secondary" })}
					>
						Voltar para a biblioteca
					</Link>
				</>
			)}
			{state.kind === "ended" && (
				<>
					<h1 className="font-bold text-2xl">Esta partida foi encerrada.</h1>
					<Link
						to="/quizzes/$quizId"
						params={{ quizId: state.quizId }}
						className={buttonVariants({ variant: "secondary" })}
					>
						Voltar ao quiz
					</Link>
				</>
			)}
			{state.kind === "error" && (
				<>
					<h1 className="font-bold text-2xl">
						Não foi possível carregar a partida
					</h1>
					<Button variant="secondary" onClick={state.onRetry}>
						Tentar novamente
					</Button>
				</>
			)}
		</GameScreen>
	);
}
