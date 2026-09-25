import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { HomeQuizItem } from "@/components/home/home-quiz-item";
import { useCreateQuiz } from "@/components/layout/create-quiz-context";
import type { HomeOverviewView } from "@/lib/api-types";

export type RecentQuizzesState =
	| { status: "pending" }
	| { status: "error" }
	| { status: "ready"; overview: HomeOverviewView };

/** "Seus quizzes": the newest ones plus the way into the whole library (spec 002, RN-15 a RN-18). */
export function RecentQuizzesCard({
	state,
	onRetry,
	now = new Date(),
}: {
	state: RecentQuizzesState;
	onRetry: () => void;
	now?: Date;
}) {
	return (
		<section
			aria-labelledby="recent-quizzes-title"
			className="flex flex-col gap-3 rounded-md bg-card p-4 ring-1 ring-foreground/10"
		>
			<div className="flex items-center justify-between gap-3">
				<h2 id="recent-quizzes-title" className="font-bold text-lg">
					Seus quizzes
				</h2>
				{state.status === "ready" ? (
					<Link
						to="/library"
						search={{ section: "recent" }}
						className="font-semibold text-primary text-sm hover:underline"
					>
						Ver tudo ({state.overview.totalQuizCount})
					</Link>
				) : null}
			</div>

			<CardBody state={state} onRetry={onRetry} now={now} />
		</section>
	);
}

function CardBody({
	state,
	onRetry,
	now,
}: {
	state: RecentQuizzesState;
	onRetry: () => void;
	now: Date;
}) {
	const { openCreateQuiz } = useCreateQuiz();

	if (state.status === "pending") {
		return (
			<div
				role="status"
				aria-label="Carregando seus quizzes"
				className="flex flex-col gap-2"
			>
				{[0, 1, 2].map((row) => (
					<div key={row} className="flex items-center gap-3 p-2">
						<Skeleton className="aspect-video w-20 shrink-0" />
						<div className="flex flex-1 flex-col gap-2">
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="h-3 w-1/4" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (state.status === "error") {
		return (
			<div className="flex flex-col items-center gap-3 py-8 text-center">
				<p className="font-semibold text-sm">
					Não foi possível carregar seus quizzes.
				</p>
				<Button variant="outline" onClick={onRetry}>
					Tentar novamente
				</Button>
			</div>
		);
	}

	if (state.overview.quizzes.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 py-8 text-center">
				<p className="font-semibold">Você ainda não tem quizzes.</p>
				<p className="text-muted-foreground text-sm">
					Crie o primeiro e ele aparece aqui.
				</p>
				<Button onClick={openCreateQuiz}>
					<PlusIcon data-icon="inline-start" />
					Criar meu primeiro quiz
				</Button>
			</div>
		);
	}

	return (
		<ul aria-label="Seus quizzes" className="flex flex-col">
			{state.overview.quizzes.map((quiz) => (
				<HomeQuizItem key={quiz.id} quiz={quiz} now={now} />
			))}
		</ul>
	);
}
