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
			{/* On a wide screen the column sits against the main sidebar, full
			    height, as in Kahoot: it takes back the content's padding. */}
			<div className="flex lg:-mx-4 lg:-my-6 lg:min-h-[calc(100%+3rem)]">
				<div className="hidden shrink-0 border-border border-r bg-card px-3 py-4 lg:block">
					{/* Stays in view while the feed scrolls under it. Sticky counts
					    from inside the content's 1.5rem padding, which this layout
					    takes back: -0.5rem keeps the column's own 1rem from the top. */}
					<div className="sticky -top-2">
						<GroupsColumn
							section={section}
							recent={recent.data?.items ?? []}
							activeGroupId={groupId}
							onCreate={() => setCreating(true)}
						/>
					</div>
				</div>
				<div className="min-w-0 flex-1 lg:px-8 lg:py-6">
					<div className="mx-auto w-full max-w-6xl">
						<Outlet />
					</div>
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
