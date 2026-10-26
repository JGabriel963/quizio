import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";
import { AssignToGroupsControl } from "@/components/groups/assign/assign-to-groups-control";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";
import { AssignFlow } from "./assign-flow";

/**
 * "Atribuir" wired to the API (spec 029, RN-02): opens "Configurar
 * atividade" for a quiz and, once shared, says "Atividade criada" with the way
 * to its report (RN-26). The returned element goes anywhere on the page.
 */
export function useAssignQuiz(): {
	assign: (quiz: { id: string; title: string }) => void;
	dialog: ReactNode;
} {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const origin = useOrigin();
	const [quiz, setQuiz] = useState<{
		id: string;
		title: string;
		openedAt: Date;
	} | null>(null);
	// "Atribuir a grupos" of the share dialog (spec 038).
	const [groupsFor, setGroupsFor] = useState<string | null>(null);
	const setup = useQuery({
		...trpc.game.assignment.setup.queryOptions(),
		enabled: quiz !== null,
	});
	// What is still open of this quiz is offered first (spec 029, RN-05a).
	const openAssignments = useQuery({
		...trpc.game.assignment.openOfQuiz.queryOptions({ quizId: quiz?.id ?? "" }),
		enabled: quiz !== null,
		// Always the current list: each one counts down and may have ended.
		staleTime: 0,
	});
	const create = useMutation(
		trpc.game.assignment.create.mutationOptions({
			networkMode: "always",
			// The dialog tells why on its card or in its own alert.
			meta: { suppressErrorToast: true },
		}),
	);

	const assign = useCallback(
		(next: { id: string; title: string }) =>
			setQuiz({ ...next, openedAt: new Date() }),
		[],
	);

	const dialog =
		quiz && origin ? (
			<AssignFlow
				// A new dialog for each quiz, with its own default deadline.
				key={`${quiz.id}-${quiz.openedAt.getTime()}`}
				open
				onOpenChange={(open) => {
					if (!open) {
						setQuiz(null);
					}
				}}
				quizTitle={quiz.title}
				setup={setup.data}
				now={quiz.openedAt}
				origin={origin}
				openAssignments={
					openAssignments.isError
						? // Without the list, "Atribuir" still creates (RN-05a).
							[]
						: openAssignments.data
				}
				onCreate={async ({ deadline, options }) => {
					const created = await create.mutateAsync({
						quizId: quiz.id,
						deadline: deadline.toISOString(),
						options,
					});
					await Promise.all([
						queryClient.invalidateQueries({
							queryKey: trpc.report.list.pathKey(),
						}),
						queryClient.invalidateQueries({
							queryKey: trpc.game.assignment.openOfQuiz.pathKey(),
						}),
					]);
					return created;
				}}
				onAssignToGroups={setGroupsFor}
				onDone={({ gameId }) =>
					toast("Atividade criada", {
						action: {
							label: "Ver relatório",
							onClick: () =>
								navigate({ to: "/reports/$gameId", params: { gameId } }),
						},
					})
				}
			/>
		) : null;

	return {
		assign,
		dialog: (
			<>
				{dialog}
				<AssignToGroupsControl
					gameId={groupsFor}
					onClose={() => setGroupsFor(null)}
				/>
			</>
		),
	};
}
