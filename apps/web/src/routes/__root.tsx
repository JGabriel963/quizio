import type { AppRouter } from "@quizio/api/routers/index";
import { Toaster } from "@quizio/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import appCss from "../index.css?url";
import { RealtimeProvider } from "../lib/realtime";
import { createAppRealtimeSubscriber } from "../lib/realtime-subscriber";

export interface RouterAppContext {
	trpc: TRPCOptionsProxy<AppRouter>;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Quizio",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />
			</head>
			<body>
				<RealtimeProvider createSubscriber={createAppRealtimeSubscriber}>
					{/* Chrome is per area: the creator screens mount the AppShell
					    themselves, the public ones stay bare (spec 002, RN-07). */}
					<Outlet />
				</RealtimeProvider>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" />
				<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
