import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useAssignQuiz } from "@/components/assignment/use-assign-quiz";
import { OpeningGame } from "@/components/game/opening-game";
import { useHostGame } from "@/lib/game-mutations";
import { useQuizMutations } from "@/lib/quiz-mutations";
import { useTRPC } from "@/utils/trpc";

import { DeletePermanentlyDialog } from "./delete-permanently-dialog";
import { type QuizActivityData, QuizDetailsView } from "./quiz-details-view";
import { QuizFormDialog, type QuizFormDialogState } from "./quiz-form-dialog";

/** How many reports the page reads for its numbers and its activities. */
const ACTIVITY_LIMIT = 200;

/**
 * The quiz's page with its data and its actions wired to tRPC: the route
 * `/quizzes/$quizId` and the library's drawer both show it.
 */
export function QuizDetailsPanel({
	quizId,
	navigation,
	onDeleted,
}: {
	quizId: string;
	/** The drawer's arrows and close, at the end of the top bar. */
	navigation?: ReactNode;
	/** After "Excluir definitivamente": the quiz is gone, leave it. */
	onDeleted: () => void | Promise<void>;
}) {
	const { session } = useRouteContext({ from: "/_auth" });
	const trpc = useTRPC();
	const mutations = useQuizMutations();
	const hosting = useHostGame(quizId);
	const assigning = useAssignQuiz();
	const quiz = useQuery({
		...trpc.quiz.get.queryOptions({ quizId }),
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" && failureCount < 2,
		// "Not found" is a page state here, not an unexpected failure.
		meta: { suppressErrorToast: true },
	});
	const preview = useQuery({
		...trpc.quiz.preview.queryOptions({ quizId }),
		enabled: quiz.isSuccess,
	});
	const reports = useQuery({
		...trpc.report.list.queryOptions({
			section: "reports",
			quizId,
			limit: ACTIVITY_LIMIT,
		}),
		enabled: quiz.isSuccess,
		// The numbers are a bonus: the page stands without them.
		meta: { suppressErrorToast: true },
	});
	const [formDialog, setFormDialog] = useState<QuizFormDialogState>(null);
	const [confirmingDeletion, setConfirmingDeletion] = useState(false);

	const activity: QuizActivityData | undefined = reports.data && {
		games: reports.data.total,
		participants: reports.data.items.reduce(
			(sum, item) => sum + item.participantCount,
			0,
		),
		openAssignments: reports.data.items.filter((item) => item.open),
	};

	if (quiz.isPending) {
		return (
			<div className="flex flex-col bg-card">
				<div className="flex h-13 items-center justify-end border-border border-b px-4">
					{navigation}
				</div>
				<div className="flex flex-col gap-6 px-4 py-6 sm:flex-row sm:px-6 lg:px-10">
					<Skeleton className="aspect-video w-full sm:w-56" />
					<div className="flex flex-1 flex-col gap-3">
						<Skeleton className="h-8 w-2/3" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				</div>
			</div>
		);
	}

	if (quiz.isError) {
		const notFound = quiz.error.data?.code === "NOT_FOUND";
		return (
			<div className="flex flex-col bg-card">
				{navigation && (
					<div className="flex h-13 items-center justify-end border-border border-b px-4">
						{navigation}
					</div>
				)}
				<div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
					<h1 className="font-bold text-2xl">
						{notFound
							? "Quiz não encontrado"
							: "Não foi possível carregar o quiz"}
					</h1>
					{notFound ? (
						<Link
							to="/library"
							search={{ section: "recent" }}
							className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-sm hover:text-foreground"
						>
							<ArrowLeftIcon aria-hidden="true" className="size-4" />
							Voltar para a biblioteca
						</Link>
					) : (
						<Button variant="outline" onClick={() => quiz.refetch()}>
							Tentar novamente
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<>
			<QuizDetailsView
				quiz={quiz.data}
				owner={{ userId: session.user.id, name: session.user.name }}
				preview={preview.data}
				activity={activity}
				navigation={navigation}
				actions={{
					onHost: () => hosting.start(),
					onAssign: () =>
						assigning.assign({ id: quizId, title: quiz.data.title ?? "" }),
					onEdit: () => setFormDialog({ quiz: quiz.data }),
					onDuplicate: () => mutations.duplicate.mutate({ quizId }),
					onMoveToTrash: () => mutations.moveToTrash.mutate({ quizId }),
					onRestore: () => mutations.restore.mutate({ quizId }),
					onDeletePermanently: () => setConfirmingDeletion(true),
				}}
			/>
			<QuizFormDialog state={formDialog} onClose={() => setFormDialog(null)} />
			{assigning.dialog}
			<OpeningGame
				state={hosting.state}
				onRetry={() => hosting.start()}
				onCancel={hosting.cancel}
			/>
			<DeletePermanentlyDialog
				open={confirmingDeletion}
				quizTitle={displayQuizTitle(quiz.data.title)}
				onOpenChange={setConfirmingDeletion}
				onConfirm={async () => {
					setConfirmingDeletion(false);
					await mutations.deletePermanently.mutateAsync({ quizId });
					await onDeleted();
				}}
			/>
		</>
	);
}
