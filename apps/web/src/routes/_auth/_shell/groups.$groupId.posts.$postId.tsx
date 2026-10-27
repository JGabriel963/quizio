import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { GroupPostPage } from "@/components/groups/group-post-page";
import {
	GroupLoadError,
	GroupNotFound,
	GroupSkeleton,
} from "@/components/groups/group-states";
import type { SharedQuizActions } from "@/components/groups/shared/shared-quiz-menu";
import { isGroupNotFound } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { domainCodeOf } from "@/lib/quiz-error-messages";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

/** A post on its own page, opened by a notification (spec 040, RN-19, RN-20). */
export const Route = createFileRoute(
	"/_auth/_shell/groups/$groupId/posts/$postId",
)({
	component: GroupPostRoute,
});

const isPostNotFound = (error: unknown) =>
	domainCodeOf(error) === "GROUP.POST_NOT_FOUND";

function GroupPostRoute() {
	const { groupId, postId } = Route.useParams();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const origin = useOrigin();
	const post = useQuery({
		...trpc.group.posts.get.queryOptions({ groupId, postId }),
		// Gone, or a group one is not in: the page's own state.
		retry: (failureCount, error) =>
			!isGroupNotFound(error) && !isPostNotFound(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	});
	const quizActions: SharedQuizActions = {
		groupId,
		onDuplicate: async (quizId) => {
			const copy = await mutations.duplicateShared.mutateAsync({ quizId });
			await navigate({ to: "/creator/$quizId", params: { quizId: copy.id } });
		},
		onUnshare: (quizId) => mutations.unshare.mutateAsync({ groupId, quizId }),
	};

	if (post.isPending) {
		return <GroupSkeleton />;
	}
	if (post.isError && isGroupNotFound(post.error)) {
		return <GroupNotFound />;
	}
	if (post.isError && !isPostNotFound(post.error)) {
		return <GroupLoadError onRetry={() => post.refetch()} />;
	}

	return (
		<GroupPostPage
			groupId={groupId}
			post={post.data ?? null}
			origin={origin ?? ""}
			quizActions={quizActions}
			onLike={(liked) =>
				mutations.setLike.mutateAsync({ groupId, postId, liked })
			}
			onDelete={async () => {
				await mutations.deletePost.mutateAsync({ groupId, postId });
				// Deleting it here goes back to the feed (RN-20).
				await navigate({
					to: "/groups/$groupId",
					params: { groupId },
					search: { tab: "activity" },
				});
			}}
		/>
	);
}
