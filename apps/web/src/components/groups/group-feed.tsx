import { Button } from "@quizio/ui/components/button";

import type { GroupPostData } from "@/lib/api-types";

import { GroupPost } from "./group-post";
import type { SharedQuizActions } from "./shared/shared-quiz-menu";

/**
 * The Atividade tab's posts, newest first as the server sends them, and
 * "Mostrar mais publicações" while there are more (spec 036, RN-18).
 */
export function GroupFeed({
	posts,
	origin,
	quizActions,
	hasMore = false,
	loadingMore = false,
	onLoadMore,
	onLike,
	onDelete,
}: {
	posts: readonly GroupPostData[];
	origin: string;
	quizActions: SharedQuizActions;
	hasMore?: boolean;
	loadingMore?: boolean;
	onLoadMore?: () => void;
	onLike: (postId: string, liked: boolean) => Promise<unknown>;
	onDelete: (postId: string) => Promise<unknown>;
}) {
	return (
		<div className="flex flex-col gap-4">
			{posts.map((post) => (
				<GroupPost
					key={post.id}
					post={post}
					origin={origin}
					quizActions={quizActions}
					onLike={(liked) => onLike(post.id, liked)}
					onDelete={() => onDelete(post.id)}
				/>
			))}
			{hasMore && (
				<Button
					variant="secondary"
					className="self-center"
					disabled={loadingMore}
					aria-busy={loadingMore || undefined}
					onClick={onLoadMore}
				>
					Mostrar mais publicações
				</Button>
			)}
		</div>
	);
}
