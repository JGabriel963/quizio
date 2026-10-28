import { Progress } from "@quizio/ui/components/progress";
import { Link } from "@tanstack/react-router";

import { timeUntil } from "@/lib/time-until";

/** The person's own agent does the same through Quizio's tools (spec 044). */
function OwnAgentHint() {
	return (
		<p className="border-border border-t pt-3 text-muted-foreground text-sm">
			Prefere usar seu próprio agente de IA? Conecte o ChatGPT, o Claude ou
			outro em{" "}
			<Link
				to="/settings"
				search={{ section: "agents" }}
				className="font-semibold text-primary hover:underline"
			>
				Agentes de IA
			</Link>
			.
		</p>
	);
}

/**
 * Acesso à IA (spec 039, RN-17 to RN-19): read only. The quota is the
 * instance's (spec 027) and is not changed here.
 */
export function AiAccessSection({
	status,
}: {
	status: {
		enabled: boolean;
		used: number;
		limit: number;
		nextFreeInMs: number | null;
	};
}) {
	if (!status.enabled) {
		return (
			<section className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-sm">
				<p>O assistente de criação não está disponível neste Quizio.</p>
				<OwnAgentHint />
			</section>
		);
	}
	const usedUp = status.used >= status.limit;
	return (
		<section className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-sm">
			<p className="font-semibold">O assistente de criação está disponível.</p>
			<p>
				{status.used} de {status.limit} criações nas últimas 24 horas
			</p>
			<Progress
				aria-label="Criações usadas"
				value={Math.round(
					(Math.min(status.used, status.limit) / status.limit) * 100,
				)}
			/>
			{usedUp && (
				<p className="text-sm">
					Você usou todas as criações das últimas 24 horas.
				</p>
			)}
			{status.nextFreeInMs !== null && (
				<p className="text-muted-foreground text-sm">
					A próxima criação volta a ficar livre {timeUntil(status.nextFreeInMs)}
					.
				</p>
			)}
			<OwnAgentHint />
		</section>
	);
}
