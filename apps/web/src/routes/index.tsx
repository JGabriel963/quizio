import { Button } from "@quizio/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const trpc = useTRPC();
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-16 text-center">
			<div className="flex flex-col gap-3">
				<h1 className="font-black text-5xl text-brand tracking-tight">
					Quizio
				</h1>
				<p className="text-lg text-muted-foreground">
					Quizzes ao vivo, sem limite de participantes.
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-3">
				<Button
					size="lg"
					render={<Link to="/library" search={{ section: "recent" }} />}
					nativeButton={false}
				>
					Ir para a biblioteca
				</Button>
				<Button
					size="lg"
					variant="brand"
					render={<Link to="/design-system" />}
					nativeButton={false}
				>
					Ver design system
				</Button>
			</div>
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<span
					className={`size-2 rounded-full ${healthCheck.data ? "bg-success" : "bg-destructive"}`}
				/>
				{healthCheck.isLoading
					? "Verificando API…"
					: healthCheck.data
						? "API conectada"
						: "API indisponível"}
			</div>
		</main>
	);
}
