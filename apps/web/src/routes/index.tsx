import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonCard } from "@/components/home/coming-soon-card";
import { HomeGreeting } from "@/components/home/home-greeting";
import {
	RecentQuizzesCard,
	type RecentQuizzesState,
} from "@/components/home/recent-quizzes-card";
import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizProvider } from "@/components/layout/create-quiz-context";
import { PublicLanding } from "@/components/public-landing";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	// `/` serves both audiences: the landing for visitors, the dashboard for
	// creators (spec 002, RN-01).
	beforeLoad: async () => ({ session: await getUser() }),
	component: HomeRoute,
});

function HomeRoute() {
	const { session } = Route.useRouteContext();

	if (!session) {
		return <PublicLanding />;
	}

	return (
		<CreateQuizProvider>
			<AppShell pathname="/">
				<Dashboard name={session.user.name} />
			</AppShell>
		</CreateQuizProvider>
	);
}

function Dashboard({ name }: { name: string }) {
	const trpc = useTRPC();
	const home = useQuery(trpc.library.home.queryOptions());

	const state: RecentQuizzesState = home.isPending
		? { status: "pending" }
		: home.isError
			? { status: "error" }
			: { status: "ready", overview: home.data };

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<HomeGreeting name={name} />
			<RecentQuizzesCard state={state} onRetry={() => home.refetch()} />
			<ComingSoonCard title="Relatórios mais recentes">
				Os relatórios chegam junto com as partidas ao vivo: aqui você verá o
				resultado de cada partida que organizar.
			</ComingSoonCard>
		</div>
	);
}
