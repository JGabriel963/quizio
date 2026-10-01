import { Button } from "@quizio/ui/components/button";

import type { OpeningGameState } from "@/lib/game-mutations";
import { joinAddress } from "@/lib/join-link";

import { GameScreen } from "./game-screen";

/** The cartaz Kahoot shows while the lobby is not there yet (spec 008, RN-13). */
export function PreparingLobby({ address }: { address: string }) {
	return (
		<div
			role="status"
			className="flex flex-col items-center gap-10 text-neutral-800"
		>
			<p className="rounded-md bg-white px-5 py-3 text-center font-black text-3xl shadow-lg sm:text-5xl">
				Prepare-se para participar
			</p>
			<div className="flex flex-col items-stretch overflow-hidden rounded-md bg-white shadow-lg sm:flex-row sm:items-center">
				<p className="px-5 py-3 text-lg">
					Entre em <strong>{address}</strong>
				</p>
				<p className="m-2 rounded bg-neutral-800 px-4 py-2 text-center font-black text-lg text-white">
					Carregando PIN do jogo
				</p>
			</div>
		</div>
	);
}

/**
 * Covers the page between "Organizar ao vivo" and the lobby, and says so when
 * the game could not be created (RN-13).
 */
export function OpeningGame({
	state,
	onRetry,
	onCancel,
}: {
	state: OpeningGameState;
	onRetry: () => void;
	/** "Voltar ao quiz": back to the page underneath. */
	onCancel: () => void;
}) {
	if (state.kind === "idle") {
		return null;
	}

	return (
		<GameScreen className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-4">
			{state.kind === "opening" ? (
				<PreparingLobby address={joinAddress(window.location.origin)} />
			) : (
				<div role="alert" className="flex flex-col items-center gap-5">
					<p className="text-center font-bold text-2xl">
						Não foi possível abrir a partida.
					</p>
					<div className="flex flex-wrap justify-center gap-2">
						<Button variant="secondary" onClick={onRetry}>
							Tentar de novo
						</Button>
						<Button variant="outline" onClick={onCancel}>
							Voltar ao quiz
						</Button>
					</div>
				</div>
			)}
		</GameScreen>
	);
}
