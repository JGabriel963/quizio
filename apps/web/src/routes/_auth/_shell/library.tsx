import { LIBRARY_SECTIONS } from "@quizio/core/library/domain/library-section";
import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button } from "@quizio/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { useCreateQuiz } from "@/components/layout/create-quiz-context";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { LibrarySearch } from "@/components/library/library-search";
import {
	LIBRARY_SECTION_LABELS,
	LibraryTabs,
} from "@/components/library/library-tabs";
import { QuizList, QuizListSkeleton } from "@/components/library/quiz-list";
import type { QuizItemActions } from "@/components/library/quiz-list-item";
import { DeletePermanentlyDialog } from "@/components/quiz/delete-permanently-dialog";
import {
	QuizFormDialog,
	type QuizFormDialogState,
} from "@/components/quiz/quiz-form-dialog";
import type { LibraryItemView } from "@/lib/api-types";
import { quizErrorMessage } from "@/lib/quiz-error-messages";
import { useQuizMutations } from "@/lib/quiz-mutations";
import { useTRPC } from "@/utils/trpc";

const librarySearchSchema = z.object({
	section: z.enum(LIBRARY_SECTIONS).catch("recent").default("recent"),
	q: z.string().optional(),
});

export const Route = createFileRoute("/_auth/_shell/library")({
	validateSearch: librarySearchSchema,
	component: LibraryPage,
});

function LibraryPage() {
	const { section, q = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const mutations = useQuizMutations();
	const { createQuiz } = useCreateQuiz();
	const library = useQuery(
		trpc.library.list.queryOptions({ section, search: q || undefined }),
	);
	const [formDialog, setFormDialog] = useState<QuizFormDialogState>(null);
	const [pendingDeletion, setPendingDeletion] =
		useState<LibraryItemView | null>(null);

	const actions: QuizItemActions = {
		onEdit: async (item) => {
			try {
				const quiz = await queryClient.fetchQuery(
					trpc.quiz.get.queryOptions({ quizId: item.id }),
				);
				setFormDialog({ quiz });
			} catch (error) {
				// The global query error toast already reports the failure.
				console.error(quizErrorMessage(error));
			}
		},
		onDuplicate: (item) => mutations.duplicate.mutate({ quizId: item.id }),
		onMoveToTrash: (item) => mutations.moveToTrash.mutate({ quizId: item.id }),
		onRestore: (item) => mutations.restore.mutate({ quizId: item.id }),
		onDeletePermanently: (item) => setPendingDeletion(item),
	};

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			{/* A plain wrapper keeps the tab rail at its content width: the
			    column would otherwise stretch it edge to edge. */}
			<div>
				<LibraryTabs active={section} />
			</div>

			<section className="flex min-w-0 flex-col gap-4">
				<h1 className="font-bold text-2xl">
					{LIBRARY_SECTION_LABELS[section]}
				</h1>

				<LibrarySearch
					value={q}
					onSearch={(value) =>
						navigate({
							search: { section, q: value.trim() || undefined },
							replace: true,
						})
					}
				/>

				{library.isPending ? (
					<QuizListSkeleton />
				) : library.isError ? (
					<div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-10 text-center">
						<p className="font-semibold">
							Não foi possível carregar a biblioteca.
						</p>
						<Button variant="outline" onClick={() => library.refetch()}>
							Tentar novamente
						</Button>
					</div>
				) : library.data.length === 0 ? (
					q ? (
						<LibraryEmptyState kind="search" search={q} />
					) : section === "trash" ? (
						<LibraryEmptyState kind="trash" />
					) : (
						<LibraryEmptyState kind="library" onCreate={createQuiz} />
					)
				) : (
					<QuizList items={library.data} section={section} actions={actions} />
				)}
			</section>

			<QuizFormDialog state={formDialog} onClose={() => setFormDialog(null)} />
			<DeletePermanentlyDialog
				open={pendingDeletion !== null}
				quizTitle={displayQuizTitle(pendingDeletion?.title ?? null)}
				onOpenChange={(open) => {
					if (!open) {
						setPendingDeletion(null);
					}
				}}
				onConfirm={() => {
					if (pendingDeletion) {
						mutations.deletePermanently.mutate({ quizId: pendingDeletion.id });
					}
					setPendingDeletion(null);
				}}
			/>
		</div>
	);
}
