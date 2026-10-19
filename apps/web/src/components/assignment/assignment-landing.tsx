import { Badge } from "@quizio/ui/components/badge";
import { Button, buttonVariants } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { UserRoundIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

import { GameScreen, Wordmark } from "@/components/game/game-screen";
import { openFor } from "@/lib/time-until";

/** What the server tells of an assignment (spec 029, RN-46 to RN-48). */
export type AssignmentLandingData =
	| {
			status: "open";
			name: string;
			creatorName: string;
			remainingMs: number;
			participantCount: number;
	  }
	| { status: "ended"; name: string };

export type AssignmentLandingState =
	| { kind: "loading" }
	| { kind: "error"; onRetry: () => void }
	| { kind: "missing" }
	| { kind: "ready"; view: AssignmentLandingData };

const fieldClass =
	"h-12 w-full rounded border-2 border-neutral-300 bg-white px-3 text-center font-bold text-lg text-neutral-800 outline-none placeholder:font-semibold placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-70";

/**
 * What whoever opens the link or types the PIN sees (spec 029, RN-44 to
 * RN-48): the activity, its creator and how long it stays open. The nickname
 * waits for the game of the assignment (029-2/2), so it is "Em breve".
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
	const { view } = state;
	if (view.status === "ended") {
		return (
			<Frame>
				<Card>
					<h1 className="font-black text-2xl">Esta atividade foi encerrada</h1>
					<p className="font-semibold">{view.name}</p>
					<PinLink />
				</Card>
			</Frame>
		);
	}
	return <OpenActivity view={view} />;
}

function OpenActivity({
	view,
}: {
	view: Extract<AssignmentLandingData, { status: "open" }>;
}) {
	const nicknameId = useId();
	return (
		<GameScreen className="flex min-h-svh flex-col items-center p-4">
			<div className="flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-lg bg-white/10 shadow-xl backdrop-blur-sm">
				<header className="flex flex-wrap items-center justify-between gap-2 bg-black/30 px-5 py-3 text-sm sm:text-base">
					<p>
						<strong>Atividade</strong> por {view.creatorName}
					</p>
					<p className="font-semibold">{openFor(view.remainingMs)}</p>
				</header>
				<div className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
					<Wordmark className="text-5xl" />
					<h1 className="text-center font-black text-2xl">{view.name}</h1>
					<p className="inline-flex items-center gap-2 rounded bg-black/40 px-3 py-1 font-semibold">
						<UserRoundIcon aria-hidden="true" className="size-4" />
						{view.participantCount}{" "}
						{view.participantCount === 1 ? "participante" : "participantes"}
					</p>
					<form
						className="mt-auto flex w-full max-w-sm flex-col gap-3"
						onSubmit={(event) => event.preventDefault()}
					>
						<p className="flex items-center justify-center gap-2 text-center font-semibold">
							Esta atividade estará disponível para jogar em breve.
							<Badge variant="soon" className="text-white">
								Em breve
							</Badge>
						</p>
						<label htmlFor={nicknameId} className="sr-only">
							Insira um apelido
						</label>
						<input
							id={nicknameId}
							placeholder="Insira um apelido"
							disabled
							className={fieldClass}
						/>
						<Button type="submit" variant="game" size="lg" disabled>
							Ok, vamos lá!
						</Button>
						<p className="self-center rounded bg-white/90 px-2 py-1 text-neutral-800 text-sm">
							Não use seu nome verdadeiro
						</p>
					</form>
				</div>
			</div>
		</GameScreen>
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
