import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";

import { DeletePermanentlyDialog } from "@/components/quiz/delete-permanently-dialog";
import { QuizDetailsView } from "@/components/quiz/quiz-details-view";
import {
	QuizFormDialog,
	type QuizFormDialogState,
} from "@/components/quiz/quiz-form-dialog";
import { useQuizMutations } from "@/lib/quiz-mutations";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/quizzes/$quizId")({
	component: QuizDetailsPage,
});

function QuizDetailsPage() {
	const { quizId } = Route.useParams();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useQuizMutations();
	const quiz = useQuery({
		...trpc.quiz.get.queryOptions({ quizId }),
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" && failureCount < 2,
		// "Not found" is a page state here, not an unexpected failure.
		meta: { suppressErrorToast: true },
	});
	const [formDialog, setFormDialog] = useState<QuizFormDialogState>(null);
	const [confirmingDeletion, setConfirmingDeletion] = useState(false);

	const backToLibrary = (
		<Link
			to="/library"
			search={{ section: quiz.data?.trashedAt ? "trash" : "recent" }}
			className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-sm hover:text-foreground"
		>
			<ArrowLeftIcon aria-hidden="true" className="size-4" />
			Voltar para a biblioteca
		</Link>
	);

	if (quiz.isPending) {
		return (
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
				<Skeleton className="h-4 w-40" />
				<div className="flex flex-col gap-6 md:flex-row">
					<Skeleton className="aspect-video w-full md:w-80" />
					<div className="flex flex-1 flex-col gap-3">
						<Skeleton className="h-8 w-2/3" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				</div>
			</main>
		);
	}

	if (quiz.isError) {
		const notFound = quiz.error.data?.code === "NOT_FOUND";
		return (
			<main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center">
				<h1 className="font-bold text-2xl">
					{notFound
						? "Quiz não encontrado"
						: "Não foi possível carregar o quiz"}
				</h1>
				{notFound ? (
					backToLibrary
				) : (
					<Button variant="outline" onClick={() => quiz.refetch()}>
						Tentar novamente
					</Button>
				)}
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
			{backToLibrary}
			<QuizDetailsView
				quiz={quiz.data}
				actions={{
					onEdit: () => setFormDialog({ mode: "edit", quiz: quiz.data }),
					onDuplicate: () => mutations.duplicate.mutate({ quizId }),
					onMoveToTrash: () => mutations.moveToTrash.mutate({ quizId }),
					onRestore: () => mutations.restore.mutate({ quizId }),
					onDeletePermanently: () => setConfirmingDeletion(true),
				}}
			/>
			<QuizFormDialog state={formDialog} onClose={() => setFormDialog(null)} />
			<DeletePermanentlyDialog
				open={confirmingDeletion}
				quizTitle={displayQuizTitle(quiz.data.title)}
				onOpenChange={setConfirmingDeletion}
				onConfirm={async () => {
					setConfirmingDeletion(false);
					await mutations.deletePermanently.mutateAsync({ quizId });
					await navigate({ to: "/library", search: { section: "trash" } });
				}}
			/>
		</main>
	);
}
