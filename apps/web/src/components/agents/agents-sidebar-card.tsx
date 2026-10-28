import { cn } from "@quizio/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BotIcon } from "lucide-react";

import { hasConnectedAgent } from "@/lib/agent-access";
import type { AgentAccessData } from "@/lib/api-types";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

/**
 * At the foot of the sidebar (spec 044): a quiet reminder that the person's
 * own AI agent can work in Quizio, leading to Agentes de IA.
 */
export function AgentsSidebarCard({
	onNavigate,
}: {
	/** Lets the narrow screen's sheet close after following it. */
	onNavigate?: () => void;
}) {
	return (
		<Link
			to="/settings"
			search={{ section: "agents" }}
			onClick={onNavigate}
			className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3 text-sm transition-colors hover:bg-muted"
		>
			<span
				aria-hidden="true"
				className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
			>
				<BotIcon className="size-4" />
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="font-semibold">Agentes de IA</span>
				<span className="text-muted-foreground text-xs leading-snug">
					Use o ChatGPT, o Claude ou outro agente no Quizio.
				</span>
			</span>
		</Link>
	);
}

/**
 * The card is a reminder: it goes once an agent reached the account, and it
 * does not show while that is unknown, so it never shows only to go away.
 */
export function AgentsSidebarNoticeView({
	access,
	onNavigate,
	className,
}: {
	access: Pick<AgentAccessData, "connections" | "keys"> | undefined;
	onNavigate?: () => void;
	className?: string;
}) {
	if (!access || hasConnectedAgent(access)) {
		return null;
	}
	return (
		<div className={cn(className)}>
			<AgentsSidebarCard onNavigate={onNavigate} />
		</div>
	);
}

/** The sidebar's notice, for a signed-in person (the agents are theirs). */
export function AgentsSidebarNotice(props: {
	onNavigate?: () => void;
	className?: string;
}) {
	const { data: session } = authClient.useSession();
	return session ? <SessionAgentsSidebarNotice {...props} /> : null;
}

function SessionAgentsSidebarNotice(props: {
	onNavigate?: () => void;
	className?: string;
}) {
	const trpc = useTRPC();
	// The same query as Agentes de IA, so connecting there hides the card.
	const access = useQuery({
		...trpc.agent.access.queryOptions(),
		meta: { suppressErrorToast: true },
	});
	return <AgentsSidebarNoticeView access={access.data} {...props} />;
}
