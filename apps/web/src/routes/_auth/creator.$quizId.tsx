import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useState } from "react";

import { EditorUnavailable } from "@/components/editor/editor-unavailable";
import { QuizEditor } from "@/components/editor/quiz-editor";
import { QuizFormDialog } from "@/components/quiz/quiz-form-dialog";
import type { QuizEditorData } from "@/lib/api-types";
import { useEditorActions } from "@/lib/question-mutations";
import { SaveTrackerProvider, useSaveTracker } from "@/lib/save-tracker";
import { useTRPC } from "@/utils/trpc";

/** The quiz editor, full screen outside the creator shell (spec 003). */
export const Route = createFileRoute("/_auth/creator/$quizId")({
	component: CreatorPage,
});

function CreatorPage() {
	const { quizId } = Route.useParams();
	return (
		// One tracker per quiz: switching quizzes never mixes pending saves.
		<SaveTrackerProvider key={quizId}>
			<Creator quizId={quizId} />
		</SaveTrackerProvider>
	);
}

function Creator({ quizId }: { quizId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const tracker = useSaveTracker();
	const actions = useEditorActions(quizId);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [titleRevision, setTitleRevision] = useState(0);
	const editor = useQuery({
		...trpc.quiz.editor.queryOptions({ quizId }),
		retry: (failureCount, error) =>
			error.data?.code !== "NOT_FOUND" &&
			error.data?.domainCode !== "QUIZ.IN_TRASH" &&
			failureCount < 2,
		// Two tabs on the same quiz converge when the window regains focus.
		refetchOnWindowFocus: true,
		// "Not found" and "in the trash" are page states, not surprises.
		meta: { suppressErrorToast: true },
	});

	// Pending saves go out before leaving; if they cannot, the creator decides (RN-23).
	useBlocker({
		shouldBlockFn: async () =>
			!(await tracker.flush()) &&
			!window.confirm("Algumas alterações não foram salvas. Sair mesmo assim?"),
		enableBeforeUnload: () => tracker.getStatus() !== "saved",
	});

	if (editor.isPending) {
		return <EditorUnavailable state={{ kind: "loading" }} />;
	}
	if (editor.isError) {
		const { data } = editor.error;
		return (
			<EditorUnavailable
				state={
					data?.code === "NOT_FOUND"
						? { kind: "not-found" }
						: data?.domainCode === "QUIZ.IN_TRASH"
							? { kind: "trash" }
							: { kind: "error", onRetry: () => void editor.refetch() }
				}
			/>
		);
	}

	return (
		<>
			<QuizEditor
				data={editor.data}
				actions={actions}
				titleRevision={titleRevision}
				onOpenSettings={() => setSettingsOpen(true)}
				onExit={() => navigate({ to: "/quizzes/$quizId", params: { quizId } })}
			/>
			<QuizFormDialog
				state={settingsOpen ? { quiz: editor.data.quiz } : null}
				onClose={() => setSettingsOpen(false)}
				onSaved={(quiz) => {
					queryClient.setQueryData<QuizEditorData>(
						trpc.quiz.editor.queryKey({ quizId }),
						(data) => (data ? { ...data, quiz } : data),
					);
					// The header title reloads with what was saved in Configurações.
					setTitleRevision((revision) => revision + 1);
				}}
			/>
		</>
	);
}
