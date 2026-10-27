import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";

import type { GroupPostData } from "@/lib/api-types";

import { GroupPost } from "./group-post";
import type { SharedQuizActions } from "./shared/shared-quiz-menu";

/**
 * A post on its own page, opened by a notification (spec 040, RN-19,
 * RN-20): the same card as in the feed, with likes and its ⋮, and back to
 * the Atividade tab. `post` is null when it no longer exists.
 */
export function GroupPostPage({
	groupId,
	post,
	origin,
	quizActions,
	onLike,
	onDelete,
}: {
	groupId: string;
	post: GroupPostData | null;
	origin: string;
	quizActions: SharedQuizActions;
	onLike: (liked: boolean) => Promise<unknown>;
	onDelete: () => Promise<unknown>;
}) {
	if (!post) {
		return (
			<div className="flex flex-col items-center gap-4 py-16 text-center">
				<p className="font-semibold">
					Esta publicação não está mais disponível.
				</p>
				<Button
					variant="outline"
					nativeButton={false}
					render={
						<Link
							to="/groups/$groupId"
							params={{ groupId }}
							search={{ tab: "activity" }}
						/>
					}
				>
					Voltar ao grupo
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
			<Button
				variant="outline"
				size="icon"
				aria-label="Voltar"
				nativeButton={false}
				render={
					<Link
						to="/groups/$groupId"
						params={{ groupId }}
						search={{ tab: "activity" }}
					/>
				}
				className="self-start"
			>
				<ChevronLeftIcon />
			</Button>
			<GroupPost
				post={post}
				origin={origin}
				quizActions={quizActions}
				onLike={onLike}
				onDelete={onDelete}
			/>
		</div>
	);
}
