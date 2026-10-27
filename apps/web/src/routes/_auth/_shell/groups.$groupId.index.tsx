import { GROUP_ASSIGNMENT_SORTS } from "@quizio/core/groups/domain/group-assignment";
import {
	SHARED_QUIZ_SORTS,
	SHARED_QUIZZES_PAGE_SIZE,
} from "@quizio/core/groups/domain/shared-quiz";
import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { AssignInGroupFlow } from "@/components/groups/assign/assign-in-group-flow";
import {
	DeleteGroupDialog,
	LeaveGroupDialog,
} from "@/components/groups/confirm-group-dialogs";
import { GroupActivity } from "@/components/groups/group-activity";
import { GroupAssignmentsTab } from "@/components/groups/group-assignments-tab";
import { GroupFeed } from "@/components/groups/group-feed";
import { GroupHeader } from "@/components/groups/group-header";
import { GroupInfoDialog } from "@/components/groups/group-info-dialog";
import { GroupInviteControl } from "@/components/groups/group-invite-control";
import {
	GroupLoadError,
	GroupNotFound,
	GroupSkeleton,
} from "@/components/groups/group-states";
import { GROUP_TABS, GroupTabs } from "@/components/groups/group-tabs";
import {
	CreatePostFlow,
	type GroupFileUploader,
} from "@/components/groups/post/create-post-flow";
import { ShareQuizzesDialog } from "@/components/groups/shared/share-quizzes-dialog";
import type { SharedQuizActions } from "@/components/groups/shared/shared-quiz-menu";
import { SharedQuizzesTab } from "@/components/groups/shared/shared-quizzes-tab";
import { isGroupNotFound } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { uploadFile } from "@/lib/upload-file";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

const groupSearchSchema = z.object({
	tab: z.enum(GROUP_TABS).catch("activity").default("activity"),
	sort: z.enum(GROUP_ASSIGNMENT_SORTS).catch("recent").default("recent"),
	/** "Ordenar por" of the Compartilhado tab (spec 037, RN-14). */
	order: z.enum(SHARED_QUIZ_SORTS).catch("recent").default("recent"),
});

export const Route = createFileRoute("/_auth/_shell/groups/$groupId/")({
	validateSearch: groupSearchSchema,
	component: GroupPage,
});

/** A group's page (spec 034, RN-13 to RN-20; specs 036 to 038). */
function GroupPage() {
	const { groupId } = Route.useParams();
	const { tab, sort, order } = Route.useSearch();
	const { session } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const origin = useOrigin();
	const mutations = useGroupMutations();
	const [dialog, setDialog] = useState<
		"info" | "invite" | "leave" | "delete" | null
	>(null);
	// When the assign flow opened: its default deadline counts from then.
	const [assigningSince, setAssigningSince] = useState<Date | null>(null);
	const [posting, setPosting] = useState(false);
	// The Compart. of the box and of the tab (spec 037, RN-05).
	const [sharing, setSharing] = useState(false);
	const [sharedLimit, setSharedLimit] = useState(SHARED_QUIZZES_PAGE_SIZE);
	// A group that is gone (left, deleted) is the page's own state, not a toast,
	// and asking again will not bring it back.
	const groupQuery = {
		retry: (failureCount: number, error: unknown) =>
			!isGroupNotFound(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	};
	const group = useQuery({
		...trpc.group.get.queryOptions({ groupId }),
		...groupQuery,
	});
	const isMember = group.isSuccess;
	// Pages of 20, "Mostrar mais publicações" asks for the next (spec 036, RN-18).
	const feed = useInfiniteQuery({
		...trpc.group.feed.infiniteQueryOptions(
			{ groupId },
			{ getNextPageParam: (page) => page.nextCursor ?? undefined },
		),
		...groupQuery,
		enabled: isMember && tab === "activity",
	});
	const assignments = useQuery({
		...trpc.group.assignments.queryOptions({ groupId, sort }),
		...groupQuery,
		enabled: isMember && tab === "assignments",
	});
	const shared = useQuery({
		...trpc.group.shared.list.queryOptions({
			groupId,
			sort: order,
			limit: sharedLimit,
		}),
		...groupQuery,
		placeholderData: keepPreviousData,
		enabled: isMember && tab === "shared",
	});
	const abilities = group.data?.abilities;
	// "Atribuir", the Compart. and "Criar publicação" (with its kahoot
	// buttons) pick a quiz.
	const picksQuiz =
		assigningSince !== null ||
		sharing ||
		(posting && (abilities?.assign === true || abilities?.share === true));
	const sharedIds = useQuery({
		...trpc.group.shared.ids.queryOptions({ groupId }),
		enabled: isMember && abilities?.share === true && picksQuiz,
	});
	const quizzes = useQuery({
		...trpc.library.list.queryOptions({ section: "recent" }),
		enabled: picksQuiz,
	});
	const assignmentSetup = useQuery({
		...trpc.game.assignment.setup.queryOptions(),
		enabled: picksQuiz,
	});
	const { mutate: visit } = mutations.visit;

	// Opening a group puts it on top of "Grupos recentes" (RN-20).
	useEffect(() => {
		visit({ groupId });
	}, [groupId, visit]);

	if (group.isPending) {
		return <GroupSkeleton />;
	}
	if (group.isError) {
		return isGroupNotFound(group.error) ? (
			<GroupNotFound />
		) : (
			<GroupLoadError onRetry={() => group.refetch()} />
		);
	}

	const data = group.data;
	const isAdmin = data.role === "admin";
	const close = () => setDialog(null);
	const startAssigning = () => setAssigningSince(new Date());
	const deletePost = (postId: string) =>
		mutations.deletePost.mutateAsync({ groupId, postId });
	const quizActions: SharedQuizActions = {
		groupId,
		onDuplicate: async (quizId) => {
			const copy = await mutations.duplicateShared.mutateAsync({ quizId });
			await navigate({ to: "/creator/$quizId", params: { quizId: copy.id } });
		},
		onUnshare: (quizId) => mutations.unshare.mutateAsync({ groupId, quizId }),
	};
	const share = (input: { quizIds: string[]; message?: string }) =>
		mutations.share.mutateAsync({ groupId, ...input });
	const posts = feed.data?.pages.flatMap((page) => page.posts) ?? [];
	// The browser sends the file straight to storage (ADR 0017).
	const uploadGroupFile: GroupFileUploader = async (type, file, onProgress) => {
		const target = await mutations.requestUpload.mutateAsync({
			groupId,
			type,
			contentType: file.type,
			sizeBytes: file.size,
			fileName: file.name,
		});
		await uploadFile({ file, upload: target, onProgress });
		return { key: target.key };
	};

	return (
		<div className="flex flex-col gap-6">
			<GroupHeader
				group={data}
				onInfo={() => setDialog("info")}
				onLeave={() => setDialog("leave")}
				onDelete={() => setDialog("delete")}
			/>
			<GroupTabs
				groupId={groupId}
				tab={tab}
				canInvite={data.abilities.invite}
				onAddMembers={() => setDialog("invite")}
			/>
			{tab === "activity" ? (
				<GroupActivity
					isAdmin={isAdmin}
					canAssign={data.abilities.assign}
					canShare={data.abilities.share}
					setup={data.setup}
					feed={
						posts.length > 0 ? (
							<GroupFeed
								posts={posts}
								origin={origin ?? ""}
								quizActions={quizActions}
								hasMore={feed.hasNextPage}
								loadingMore={feed.isFetchingNextPage}
								onLoadMore={() => void feed.fetchNextPage()}
								onLike={(postId, liked) =>
									mutations.setLike.mutateAsync({ groupId, postId, liked })
								}
								onDelete={deletePost}
							/>
						) : null
					}
					onInvite={() => setDialog("invite")}
					onAssign={startAssigning}
					onShare={() => setSharing(true)}
					onCreatePost={() => setPosting(true)}
					onDismissSetup={() => mutations.dismissSetup.mutate({ groupId })}
				/>
			) : tab === "assignments" ? (
				<GroupAssignmentsTab
					items={assignments.data?.items ?? []}
					sort={sort}
					onSortChange={(next) =>
						navigate({ search: (prev) => ({ ...prev, sort: next }) })
					}
					canAssign={data.abilities.assign}
					onAssign={startAssigning}
					origin={origin ?? ""}
					onDelete={deletePost}
				/>
			) : (
				<SharedQuizzesTab
					items={shared.data?.items}
					hasMore={shared.data?.hasMore ?? false}
					loadingMore={shared.isPlaceholderData}
					sort={order}
					canShare={data.abilities.share}
					actions={quizActions}
					onSortChange={(next) => {
						setSharedLimit(SHARED_QUIZZES_PAGE_SIZE);
						navigate({ search: (prev) => ({ ...prev, order: next }) });
					}}
					onShare={() => setSharing(true)}
					onLoadMore={() =>
						setSharedLimit((limit) => limit + SHARED_QUIZZES_PAGE_SIZE)
					}
				/>
			)}

			{data.abilities.share && (
				<ShareQuizzesDialog
					open={sharing}
					quizzes={quizzes.data}
					ownerName={session.user.name}
					sharedIds={sharedIds.data ?? []}
					onShare={(quizIds) => share({ quizIds: [...quizIds] })}
					onClose={() => setSharing(false)}
				/>
			)}

			{data.abilities.assign && (
				<AssignInGroupFlow
					open={assigningSince !== null}
					quizzes={quizzes.data}
					ownerName={session.user.name}
					setup={assignmentSetup.data}
					now={assigningSince ?? new Date()}
					onAssign={({ deadline, ...input }) =>
						mutations.assign.mutateAsync({
							groupId,
							deadline: deadline.toISOString(),
							...input,
						})
					}
					onClose={() => setAssigningSince(null)}
				/>
			)}

			<CreatePostFlow
				open={posting}
				canAssign={data.abilities.assign}
				canShare={data.abilities.share}
				sharedIds={sharedIds.data ?? []}
				quizzes={quizzes.data}
				ownerName={session.user.name}
				setup={assignmentSetup.data}
				onUpload={uploadGroupFile}
				onDiscardUpload={(key) =>
					mutations.discardUpload.mutate({ groupId, key })
				}
				onPost={(input) => mutations.post.mutateAsync({ groupId, ...input })}
				onAssign={({ deadline, ...input }) =>
					mutations.assign.mutateAsync({
						groupId,
						deadline: deadline.toISOString(),
						...input,
					})
				}
				onShare={share}
				onClose={() => setPosting(false)}
			/>

			<GroupInfoDialog
				group={dialog === "info" ? data : null}
				onClose={close}
			/>
			{data.abilities.invite && (
				<GroupInviteControl
					groupId={groupId}
					open={dialog === "invite"}
					onClose={close}
					canReset={isAdmin}
				/>
			)}
			<LeaveGroupDialog
				name={dialog === "leave" ? data.name : null}
				onCancel={close}
				onConfirm={() =>
					mutations.leave.mutate(
						{ groupId },
						{
							onSuccess: () =>
								navigate({ to: "/groups", search: { section: "joined" } }),
						},
					)
				}
			/>
			<DeleteGroupDialog
				name={dialog === "delete" ? data.name : null}
				onCancel={close}
				onConfirm={() =>
					mutations.remove.mutate(
						{ groupId },
						{
							onSuccess: () =>
								navigate({ to: "/groups", search: { section: "managed" } }),
						},
					)
				}
			/>
		</div>
	);
}
