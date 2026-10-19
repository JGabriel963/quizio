import { Button, buttonVariants } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { GameScreen, Wordmark } from "@/components/game/game-screen";

/** What the activity's screen shows before the participant plays (spec 029, RN-47, RN-48). */
export type AssignmentLandingState =
	| { kind: "loading" }
	| { kind: "error"; onRetry: () => void }
	| { kind: "missing" }
	| { kind: "ended"; name: string };

/**
 * The activity's screen when there is nothing to play (spec 029, RN-47,
 * RN-48): on its way, out of reach, missing or over. An open activity is
 * the play flow's (spec 030).
 */
export function AssignmentLanding({
	state,
}: {
	state: AssignmentLandingState;
}) {
	if (state.kind === "loading") {
		return (
			<Frame>
				<Skeleton className="h-64 w-full max-w-md bg-white/20" />
			</Frame>
		);
	}
	if (state.kind === "error") {
		return (
			<Frame>
				<Card>
					<p className="font-bold">Não foi possível carregar a atividade.</p>
					<Button variant="game" onClick={state.onRetry}>
						Tentar novamente
					</Button>
				</Card>
			</Frame>
		);
	}
	if (state.kind === "missing") {
		return (
			<Frame>
				<Card>
					<h1 className="font-black text-2xl">Atividade não encontrada</h1>
					<p>Confira o link ou entre com o PIN que recebeu.</p>
					<PinLink />
				</Card>
			</Frame>
		);
	}
	return (
		<Frame>
			<Card>
				<h1 className="font-black text-2xl">Esta atividade foi encerrada</h1>
				<p className="font-semibold">{state.name}</p>
				<PinLink />
			</Card>
		</Frame>
	);
}

function Frame({ children }: { children: ReactNode }) {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-8 p-4">
			<Wordmark className="text-6xl" />
			{children}
		</GameScreen>
	);
}

function Card({ children }: { children: ReactNode }) {
	return (
		<div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-md bg-white p-6 text-center text-neutral-800 shadow-lg">
			{children}
		</div>
	);
}

function PinLink() {
	return (
		<Link
			to="/join"
			className={cn(buttonVariants({ variant: "game" }), "w-full")}
		>
			Entrar com um PIN
		</Link>
	);
}
