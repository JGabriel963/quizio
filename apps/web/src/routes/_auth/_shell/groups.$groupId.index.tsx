import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import {
	DeleteGroupDialog,
	LeaveGroupDialog,
} from "@/components/groups/confirm-group-dialogs";
import {
	GroupActivity,
	GroupComingSoon,
} from "@/components/groups/group-activity";
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
import { isGroupNotFound } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

const groupSearchSchema = z.object({
	tab: z.enum(GROUP_TABS).catch("activity").default("activity"),
});

export const Route = createFileRoute("/_auth/_shell/groups/$groupId/")({
	validateSearch: groupSearchSchema,
	component: GroupPage,
});

/** A group's page (spec 034, RN-13 to RN-20). */
function GroupPage() {
	const { groupId } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const [dialog, setDialog] = useState<
		"info" | "invite" | "leave" | "delete" | null
	>(null);
	const group = useQuery({
		...trpc.group.get.queryOptions({ groupId }),
		retry: (failureCount, error) => !isGroupNotFound(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
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
				isAdmin={isAdmin}
				onAddMembers={() => setDialog("invite")}
			/>
			{tab === "activity" ? (
				<GroupActivity
					isAdmin={isAdmin}
					setup={data.setup}
					onInvite={() => setDialog("invite")}
					onDismissSetup={() => mutations.dismissSetup.mutate({ groupId })}
				/>
			) : (
				<GroupComingSoon title={GROUP_TAB_LABELS[tab]} />
			)}

			<GroupInfoDialog
				group={dialog === "info" ? data : null}
				onClose={close}
			/>
			{isAdmin && (
				<GroupInviteControl
					groupId={groupId}
					open={dialog === "invite"}
					onClose={close}
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
