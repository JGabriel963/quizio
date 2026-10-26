import type { GroupPostData } from "@/lib/api-types";

import { GroupPost } from "./group-post";

/** The Atividade tab's posts, newest first as the server sends them (spec 038, RN-13). */
export function GroupFeed({
	posts,
	origin,
	onLike,
	onDelete,
}: {
	posts: readonly GroupPostData[];
	origin: string;
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
					onLike={(liked) => onLike(post.id, liked)}
					onDelete={() => onDelete(post.id)}
				/>
			))}
		</div>
	);
}
