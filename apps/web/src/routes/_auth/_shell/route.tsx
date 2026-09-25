import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizProvider } from "@/components/layout/create-quiz-context";

/**
 * Pathless layout with the creator chrome (spec 002). The editor lives outside
 * it, full screen (spec 003, RN-06).
 */
export const Route = createFileRoute("/_auth/_shell")({
	component: ShellLayout,
});

function ShellLayout() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<CreateQuizProvider>
			<AppShell pathname={pathname}>
				<Outlet />
			</AppShell>
		</CreateQuizProvider>
	);
}
