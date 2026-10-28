import { CodeBlock } from "@quizio/ui/components/code-block";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@quizio/ui/components/tabs";

import { agentInstructions } from "@/lib/agent-instructions";
import type { AgentAccessData } from "@/lib/api-types";

import { AccessKeysCard } from "./access-keys-card";
import { ConnectedAgentsCard } from "./connected-agents-card";
import type { CreatedAccessKey } from "./create-access-key-dialog";

/** The server's address, to copy into any agent (RN-13). */
function AgentServerCard({ serverUrl }: { serverUrl: string }) {
	return (
		<section className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-sm">
			<p>
				Conecte o ChatGPT, o Claude, o Codex ou outro agente de IA à sua conta
				para criar quizzes, organizar grupos e acompanhar relatórios conversando
				com ele.
			</p>
			<p className="font-semibold">Endereço do servidor</p>
			<CodeBlock code={serverUrl} label="Endereço do servidor" />
		</section>
	);
}

/** "Como conectar": a tab per reference agent, with the address filled in (RN-13). */
function ConnectInstructions({ serverUrl }: { serverUrl: string }) {
	const agents = agentInstructions(serverUrl);
	return (
		<section className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-sm">
			<h2 className="font-bold text-lg">Como conectar</h2>
			<Tabs defaultValue={agents[0]?.id}>
				<TabsList aria-label="Como conectar">
					{agents.map((agent) => (
						<TabsTrigger key={agent.id} value={agent.id}>
							{agent.label}
						</TabsTrigger>
					))}
				</TabsList>
				{agents.map((agent) => (
					<TabsContent key={agent.id} value={agent.id} className="grid gap-3">
						<ol className="list-decimal space-y-1 pl-5">
							{agent.steps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
						{agent.commands.map((command) => (
							<div key={command.label} className="grid gap-1">
								<span className="text-muted-foreground text-sm">
									{command.label}
								</span>
								<CodeBlock code={command.code} label={command.label} />
							</div>
						))}
					</TabsContent>
				))}
			</Tabs>
		</section>
	);
}

/** Configurações › Agentes de IA (spec 044, RN-12 to RN-16). */
export function AgentsSection({
	access,
	now,
	onCreateKey,
	onRevokeKey,
	onDisconnect,
}: {
	access: AgentAccessData;
	now?: Date;
	onCreateKey: (name: string) => Promise<CreatedAccessKey>;
	onRevokeKey: (keyId: string) => Promise<void>;
	onDisconnect: (connectionId: string) => Promise<void>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<AgentServerCard serverUrl={access.serverUrl} />
			<ConnectInstructions serverUrl={access.serverUrl} />
			<ConnectedAgentsCard
				connections={access.connections}
				now={now}
				onDisconnect={onDisconnect}
			/>
			<AccessKeysCard
				keys={access.keys}
				keyLimit={access.keyLimit}
				now={now}
				onCreateKey={onCreateKey}
				onRevokeKey={onRevokeKey}
			/>
		</div>
	);
}
