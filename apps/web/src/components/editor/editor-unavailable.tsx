import { Button, buttonVariants } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

export type EditorUnavailableState =
	| { kind: "loading" }
	| { kind: "not-found" }
	| { kind: "trash" }
	| { kind: "error"; onRetry: () => void };

/** Every state of the editor route other than an open quiz (spec 003). */
export function EditorUnavailable({
	state,
}: {
	state: EditorUnavailableState;
}) {
	if (state.kind === "loading") {
		return (
			<div
				role="status"
				aria-label="Carregando o editor"
				className="flex h-svh flex-col"
			>
				<Skeleton className="h-14 w-full rounded-none" />
				<div className="flex flex-1">
					<div className="hidden w-56 flex-col gap-3 p-3 lg:flex">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
					<div className="flex flex-1 flex-col gap-6 bg-brand/80 p-6">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="mx-auto aspect-video w-full max-w-xl" />
					</div>
					<Skeleton className="hidden w-72 rounded-none lg:block" />
				</div>
			</div>
		);
	}

	const content = {
		"not-found": {
			title: "Quiz não encontrado",
			action: (
				// A link styled as a button keeps link semantics (spec 002 discovery).
				<Link
					to="/library"
					search={{ section: "recent" }}
					className={buttonVariants({ variant: "outline" })}
				>
					Voltar para a biblioteca
				</Link>
			),
		},
		trash: {
			title: "Este quiz está na lixeira",
			action: (
				<Link
					to="/library"
					search={{ section: "trash" }}
					className={buttonVariants()}
				>
					Ir para a lixeira
				</Link>
			),
		},
		error: {
			title: "Não foi possível abrir o editor",
			action:
				state.kind === "error" ? (
					<Button variant="outline" onClick={state.onRetry}>
						Tentar novamente
					</Button>
				) : null,
		},
	}[state.kind];

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
			<h1 className="font-bold text-2xl">{content.title}</h1>
			{state.kind === "trash" && (
				<p className="text-muted-foreground">
					Restaure o quiz na lixeira para voltar a editá-lo.
				</p>
			)}
			{content.action}
		</main>
	);
}
