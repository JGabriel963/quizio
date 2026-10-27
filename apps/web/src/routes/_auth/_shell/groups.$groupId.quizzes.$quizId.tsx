import { Button } from "@quizio/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";

import { useAssignQuiz } from "@/components/assignment/use-assign-quiz";
import { OpeningGame } from "@/components/game/opening-game";
import {
	GroupLoadError,
	GroupNotFound,
	GroupSkeleton,
} from "@/components/groups/group-states";
import { SharedQuizPage } from "@/components/groups/shared/shared-quiz-page";
import { useHostGame } from "@/lib/game-mutations";
import {
	isGroupNotFound,
	isSharedQuizNotFound,
} from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_auth/_shell/groups/$groupId/quizzes/$quizId",
)({
	component: SharedQuizRoute,
});

/** The page of a quiz shared with the group (spec 037, RN-16 to RN-25). */
function SharedQuizRoute() {
	const { groupId, quizId } = Route.useParams();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const hosting = useHostGame(quizId);
	const assigning = useAssignQuiz();
	const quiz = useQuery({
		...trpc.group.shared.get.queryOptions({ groupId, quizId }),
		// Gone from the group, or a group one is not in: the page's own state.
		retry: (failureCount, error) =>
			!isGroupNotFound(error) &&
			!isSharedQuizNotFound(error) &&
			failureCount < 2,
		meta: { suppressErrorToast: true },
	});

	const backToShared = (
		<Link
			to="/groups/$groupId"
			params={{ groupId }}
			search={{ tab: "shared" }}
			className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-sm hover:text-foreground"
		>
			<ChevronLeftIcon aria-hidden="true" className="size-4" />
			Voltar para Compartilhado
		</Link>
	);

	if (quiz.isPending) {
		return <GroupSkeleton />;
	}
	if (quiz.isError) {
		if (isGroupNotFound(quiz.error)) {
			return <GroupNotFound />;
		}
		if (isSharedQuizNotFound(quiz.error)) {
			return (
				<div className="flex flex-col items-center gap-4 py-16 text-center">
					<p className="font-semibold">
						Este quiz não está mais disponível no grupo.
					</p>
					<Button
						variant="outline"
						nativeButton={false}
						render={
							<Link
								to="/groups/$groupId"
								params={{ groupId }}
								search={{ tab: "shared" }}
							/>
						}
					>
						Voltar para Compartilhado
					</Button>
				</div>
			);
		}
		return <GroupLoadError onRetry={() => quiz.refetch()} />;
	}
	// The owner has the quiz's own page (RN-10).
	if (quiz.data.ownedByViewer) {
		return <Navigate to="/quizzes/$quizId" params={{ quizId }} replace />;
	}

	return (
		<div className="flex flex-col gap-4">
			{backToShared}
			<SharedQuizPage
				quiz={quiz.data}
				duplicating={mutations.duplicateShared.isPending}
				onHost={() => hosting.start()}
				onAssign={() =>
					assigning.assign({ id: quizId, title: quiz.data.title })
				}
				onDuplicate={() =>
					mutations.duplicateShared.mutate(
						{ quizId },
						{
							onSuccess: (copy) =>
								navigate({
									to: "/creator/$quizId",
									params: { quizId: copy.id },
								}),
						},
					)
				}
			/>
			{assigning.dialog}
			<OpeningGame
				state={hosting.state}
				themeId={quiz.data?.themeId}
				onRetry={() => hosting.start()}
				onCancel={hosting.cancel}
			/>
		</div>
	);
}
