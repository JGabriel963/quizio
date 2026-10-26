import { GROUP_SECTIONS } from "@quizio/core/groups/domain/group-section";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	useNavigate,
	useParams,
	useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";

import { CreateGroupContext } from "@/components/groups/create-group-context";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { GroupsColumn } from "@/components/groups/groups-column";
import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

/**
 * The groups' area (spec 034): the column with the sections and "Grupos
 * recentes" beside every screen, and the "Criar grupo" dialog.
 */
export const Route = createFileRoute("/_auth/_shell/groups")({
	component: GroupsLayout,
});

function GroupsLayout() {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const mutations = useGroupMutations();
	const [creating, setCreating] = useState(false);
	const recent = useQuery(trpc.group.recent.queryOptions());
	const { groupId } = useParams({ strict: false });
	const location = useRouterState({ select: (state) => state.location });
	// The open section, only on the list itself.
	const searchSection = (location.search as { section?: unknown }).section;
	const section =
		location.pathname.replace(/\/$/, "") === "/groups"
			? (GROUP_SECTIONS.find((item) => item === searchSection) ?? "managed")
			: null;

	return (
		<CreateGroupContext.Provider value={() => setCreating(true)}>
			<div className="mx-auto flex w-full max-w-7xl gap-8">
				<div className="hidden lg:block">
					<GroupsColumn
						section={section}
						recent={recent.data?.items ?? []}
						activeGroupId={groupId}
						onCreate={() => setCreating(true)}
					/>
				</div>
				<div className="min-w-0 flex-1">
					<Outlet />
				</div>
			</div>
			<CreateGroupDialog
				open={creating}
				onClose={() => setCreating(false)}
				onCreate={async (name) => {
					const created = await mutations.create.mutateAsync({ name });
					setCreating(false);
					// Straight into the new group (RN-12).
					await navigate({
						to: "/groups/$groupId",
						params: { groupId: created.groupId },
					});
				}}
			/>
		</CreateGroupContext.Provider>
	);
}
