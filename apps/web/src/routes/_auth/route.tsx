import {
	createFileRoute,
	Outlet,
	redirect,
	useRouterState,
} from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizProvider } from "@/components/layout/create-quiz-context";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async ({ location }) => {
		const session = await getUser();
		if (!session) {
			// Come back to the requested page after signing in (spec 001, RN-09).
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		return { session };
	},
});

function AuthLayout() {
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
