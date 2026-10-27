import { Button } from "@quizio/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";

import { useAssignQuiz } from "@/components/assignment/use-assign-quiz";
import { OpeningGame } from "@/components/game/opening-game";
import {
	GroupLoadError,
	GroupSkeleton,
} from "@/components/groups/group-states";
import { SharedQuizPage } from "@/components/groups/shared/shared-quiz-page";
import { useHostGame } from "@/lib/game-mutations";
import { useGroupMutations } from "@/lib/group-mutations";
import { isPublicQuizNotFound } from "@/lib/profile-errors";
import { useTRPC } from "@/utils/trpc";

/**
 * A public quiz opened from its owner's profile (spec 039, RN-33, RN-34):
 * the page of the shared quiz, outside the group.
 */
export const Route = createFileRoute(
	"/_auth/_shell/profile/$userId/quizzes/$quizId",
)({
	component: PublicQuizRoute,
});

function PublicQuizRoute() {
	const { userId, quizId } = Route.useParams();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const hosting = useHostGame(quizId);
	const assigning = useAssignQuiz();
	const quiz = useQuery({
		...trpc.account.publicQuiz.queryOptions({ userId, quizId }),
		// Made private, trashed or deleted: the page's own state (RN-34).
		retry: (failureCount, error) =>
			!isPublicQuizNotFound(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	});

	const backToProfile = (
		<Link
			to="/profile/$userId"
			params={{ userId }}
			className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-sm hover:text-foreground"
		>
			<ChevronLeftIcon aria-hidden="true" className="size-4" />
			Voltar ao perfil
		</Link>
	);

	if (quiz.isPending) {
		return <GroupSkeleton />;
	}
	if (quiz.isError) {
		if (isPublicQuizNotFound(quiz.error)) {
			return (
				<div className="flex flex-col items-center gap-4 py-16 text-center">
					<p className="font-semibold">Este quiz não está mais disponível.</p>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link to="/profile/$userId" params={{ userId }} />}
					>
						Voltar ao perfil
					</Button>
				</div>
			);
		}
		return <GroupLoadError onRetry={() => quiz.refetch()} />;
	}
	// The owner has the quiz's own page.
	if (quiz.data.ownedByViewer) {
		return <Navigate to="/quizzes/$quizId" params={{ quizId }} replace />;
	}

	return (
		<div className="flex flex-col gap-4">
			{backToProfile}
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
				onRetry={() => hosting.start()}
				onCancel={hosting.cancel}
			/>
		</div>
	);
}
