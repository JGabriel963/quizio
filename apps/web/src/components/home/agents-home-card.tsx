import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { BotIcon } from "lucide-react";

/**
 * The person's own AI agent on the dashboard (spec 044): what it can do in
 * Quizio, and the way to connect it.
 */
export function AgentsHomeCard() {
	return (
		<section
			aria-labelledby="agents-home-title"
			className="flex flex-col gap-3 rounded-md bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
		>
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
			>
				<BotIcon className="size-5" />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h2 id="agents-home-title" className="font-bold text-lg">
					Seu agente de IA no Quizio
				</h2>
				<p className="text-muted-foreground text-sm">
					Peça ao ChatGPT, ao Claude ou a outro agente para criar quizzes,
					organizar grupos e ler relatórios por você.
				</p>
			</div>
			<Button
				variant="outline"
				className="shrink-0 self-start sm:self-center"
				render={<Link to="/settings" search={{ section: "agents" }} />}
				nativeButton={false}
			>
				Conectar um agente
			</Button>
		</section>
	);
}
