import { HOME_RECENT_QUIZ_LIMIT } from "@quizio/core/library/domain/home";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { HomeGreeting } from "@/components/home/home-greeting";
import {
	RecentQuizzesCard,
	type RecentQuizzesState,
} from "@/components/home/recent-quizzes-card";
import {
	RecentReportsCard,
	type RecentReportsState,
} from "@/components/home/recent-reports-card";
import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizProvider } from "@/components/layout/create-quiz-context";
import { PublicLanding } from "@/components/public-landing";
import { QuizDrawer } from "@/components/quiz/quiz-drawer";
import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

const homeSearchSchema = z.object({
	/** The quiz open in the drawer, under the masked `/quizzes/{id}`. */
	quiz: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/")({
	validateSearch: homeSearchSchema,
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
	const { quiz: openQuizId } = Route.useSearch();
	const navigate = Route.useNavigate();
	const home = useQuery(trpc.library.home.queryOptions());
	// As many as "Seus quizzes" shows (spec 015, RN-31).
	const reports = useQuery(
		trpc.report.list.queryOptions({
			section: "reports",
			limit: HOME_RECENT_QUIZ_LIMIT,
		}),
	);

	const state: RecentQuizzesState = home.isPending
		? { status: "pending" }
		: home.isError
			? { status: "error" }
			: { status: "ready", overview: home.data };
	const reportsState: RecentReportsState = reports.isPending
		? { status: "pending" }
		: reports.isError
			? { status: "error" }
			: { status: "ready", reports: reports.data };

	const quizzes = home.data?.quizzes ?? [];
	const openIndex = quizzes.findIndex((quiz) => quiz.id === openQuizId);
	// The arrows keep the address masked, as the cards' links do.
	const openQuiz = (quizId: string) =>
		navigate({
			search: { quiz: quizId },
			mask: {
				to: "/quizzes/$quizId",
				params: { quizId },
				unmaskOnReload: true,
			},
			replace: true,
			resetScroll: false,
		});
	const previousQuiz = openIndex > 0 ? quizzes[openIndex - 1] : undefined;
	const nextQuiz =
		openIndex >= 0 && openIndex < quizzes.length - 1
			? quizzes[openIndex + 1]
			: undefined;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<HomeGreeting name={name} />
			<RecentQuizzesCard state={state} onRetry={() => home.refetch()} />
			<RecentReportsCard
				state={reportsState}
				onRetry={() => reports.refetch()}
			/>
			<QuizDrawer
				quizId={openQuizId ?? null}
				onClose={() =>
					navigate({
						search: {},
						// Back after closing goes on from the dashboard, not to the drawer.
						replace: true,
						resetScroll: false,
					})
				}
				onPrevious={previousQuiz && (() => openQuiz(previousQuiz.id))}
				onNext={nextQuiz && (() => openQuiz(nextQuiz.id))}
			/>
		</div>
	);
}
