import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
	ConnectAgentScreen,
	type ConnectAgentState,
} from "@/components/agents/connect-agent-screen";
import { BrandLogo } from "@/components/layout/brand-logo";
import { readAgentConnectRequest } from "@/functions/agent-connect-request";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { decodeAgentRequest } from "@/lib/oauth-flow";
import { useTRPC } from "@/utils/trpc";

const connectSearchSchema = z.object({
	/** The agent's signed authorization query, wrapped by /api/agents/connect. */
	request: z.string().optional(),
});

/**
 * "Conectar ao Quizio" (spec 044, RN-03, RN-04): outside the shell, like the
 * login. Without a session the person signs in first and comes back.
 */
export const Route = createFileRoute("/connect")({
	validateSearch: connectSearchSchema,
	beforeLoad: async ({ search }) => {
		if (!(await getUser())) {
			throw redirect({ to: "/login", search: { agent: search.request } });
		}
	},
	component: ConnectPage,
});

/** Permitir or Cancelar: Better Auth answers with where the agent waits. */
async function answer(signedQuery: string, accept: boolean): Promise<void> {
	const response = await fetch("/api/auth/oauth2/consent", {
		method: "POST",
		credentials: "include",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ accept, oauth_query: signedQuery }),
	});
	const body = (await response.json().catch(() => null)) as {
		url?: string;
	} | null;
	if (!response.ok || !body?.url) {
		throw new Error("The consent was not taken");
	}
	window.location.assign(body.url);
}

function ConnectPage() {
	const { request } = Route.useSearch();
	const signedQuery = decodeAgentRequest(request);
	const trpc = useTRPC();
	const account = useQuery(trpc.account.get.queryOptions());
	const connect = useQuery({
		queryKey: ["agent-connect-request", request],
		queryFn: () =>
			readAgentConnectRequest({ data: { signedQuery: signedQuery ?? "" } }),
		enabled: signedQuery !== null,
		meta: { suppressErrorToast: true },
	});

	let state: ConnectAgentState | null = null;
	if (!signedQuery || connect.data?.valid === false || connect.isError) {
		state = { kind: "invalid" };
	} else if (connect.data?.valid && account.data) {
		state = {
			kind: "ready",
			agentName: connect.data.agentName,
			returnDomain: connect.data.returnDomain,
			account: account.data,
		};
	}

	return (
		<div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background">
			<div
				aria-hidden="true"
				className="absolute bottom-[-22rem] -left-48 -z-10 size-[38rem] rounded-full bg-muted/60"
			/>
			<header className="px-4 py-3">
				<Link to="/" className="font-black text-2xl text-brand tracking-tight">
					<BrandLogo />
				</Link>
			</header>
			<main className="flex flex-1 flex-col items-center px-4 pt-6 pb-16 sm:pt-[10vh]">
				<div className="w-full max-w-[28rem] rounded-md bg-card p-6 shadow-md">
					{state ? (
						<ConnectAgentScreen
							state={state}
							onAllow={() => answer(signedQuery ?? "", true)}
							onCancel={() => answer(signedQuery ?? "", false)}
							onSwitchAccount={async () => {
								await authClient.signOut();
								window.location.assign(
									`/login?${new URLSearchParams({ agent: request ?? "" })}`,
								);
							}}
						/>
					) : (
						<Skeleton className="h-80 w-full" />
					)}
				</div>
			</main>
		</div>
	);
}
