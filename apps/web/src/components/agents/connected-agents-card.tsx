import { Button } from "@quizio/ui/components/button";
import { useState } from "react";

import {
	connectedLabel,
	lastUseLabel,
	UNNAMED_AGENT,
} from "@/lib/agent-labels";
import type { AgentConnectionData } from "@/lib/api-types";

import { ConfirmDialog } from "./confirm-dialog";

/** Agentes conectados (spec 044, RN-14, RN-16). */
export function ConnectedAgentsCard({
	connections,
	now,
	onDisconnect,
}: {
	connections: AgentConnectionData[];
	now?: Date;
	onDisconnect: (connectionId: string) => Promise<void>;
}) {
	const [leaving, setLeaving] = useState<AgentConnectionData | null>(null);
	const nameOf = (connection: AgentConnectionData) =>
		connection.agentName ?? UNNAMED_AGENT;

	return (
		<section
			aria-labelledby="connected-agents-title"
			className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-sm"
		>
			<h2 id="connected-agents-title" className="font-bold text-lg">
				Agentes conectados
			</h2>
			{connections.length === 0 ? (
				<p className="text-muted-foreground">Nenhum agente conectado.</p>
			) : (
				<ul className="flex flex-col divide-y">
					{connections.map((connection) => (
						<li
							key={connection.id}
							className="flex flex-wrap items-center justify-between gap-3 py-3"
						>
							<div className="flex min-w-0 flex-col">
								<span className="truncate font-semibold">
									{nameOf(connection)}
								</span>
								<span className="text-muted-foreground text-sm">
									{connectedLabel(new Date(connection.connectedAt))}
								</span>
								<span className="text-muted-foreground text-sm">
									{lastUseLabel(
										connection.lastUsedAt
											? new Date(connection.lastUsedAt)
											: null,
										now,
									)}
								</span>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								aria-label={`Desconectar ${nameOf(connection)}`}
								onClick={() => setLeaving(connection)}
							>
								Desconectar
							</Button>
						</li>
					))}
				</ul>
			)}
			<ConfirmDialog
				open={leaving !== null}
				title={`Desconectar ${leaving ? nameOf(leaving) : ""}?`}
				description="Ele perde o acesso à sua conta na hora."
				action="Desconectar"
				failure="Não foi possível desconectar o agente."
				onConfirm={() => onDisconnect(leaving?.id ?? "")}
				onClose={() => setLeaving(null)}
			/>
		</section>
	);
}
