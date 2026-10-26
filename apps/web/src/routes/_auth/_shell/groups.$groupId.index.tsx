import { GROUP_ASSIGNMENT_SORTS } from "@quizio/core/groups/domain/group-assignment";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { AssignInGroupFlow } from "@/components/groups/assign/assign-in-group-flow";
import {
	DeleteGroupDialog,
	LeaveGroupDialog,
} from "@/components/groups/confirm-group-dialogs";
import {
	GroupActivity,
	GroupComingSoon,
} from "@/components/groups/group-activity";
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
import {
	GROUP_TAB_LABELS,
	GROUP_TABS,
	GroupTabs,
} from "@/components/groups/group-tabs";
import {
	CreatePostFlow,
	type GroupFileUploader,
} from "@/components/groups/post/create-post-flow";
import { isGroupNotFound } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { uploadFile } from "@/lib/upload-file";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

const groupSearchSchema = z.object({
	tab: z.enum(GROUP_TABS).catch("activity").default("activity"),
	sort: z.enum(GROUP_ASSIGNMENT_SORTS).catch("recent").default("recent"),
});

export const Route = createFileRoute("/_auth/_shell/groups/$groupId/")({
	validateSearch: groupSearchSchema,
	component: GroupPage,
});

/** A group's page (spec 034, RN-13 to RN-20; specs 036 and 038). */
function GroupPage() {
	const { groupId } = Route.useParams();
	const { tab, sort } = Route.useSearch();
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
	// "Atribuir" and "Criar publicação" (with Atribuir kahoot) pick a quiz.
	const picksQuiz =
		assigningSince !== null ||
		(posting && group.data?.abilities.assign === true);
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
					setup={data.setup}
					feed={
						posts.length > 0 ? (
							<GroupFeed
								posts={posts}
								origin={origin ?? ""}
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
				<GroupComingSoon title={GROUP_TAB_LABELS[tab]} />
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
