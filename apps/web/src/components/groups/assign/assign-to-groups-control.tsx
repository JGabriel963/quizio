import { useQuery } from "@tanstack/react-query";

import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

import { AssignToGroupsDialog } from "./assign-to-groups-dialog";

/**
 * "Atribuir a grupos" wired to the API: the groups are read only while it is
 * open, each time anew, so "Já atribuída" is current (spec 038, RN-26).
 */
export function AssignToGroupsControl({
	gameId,
	onClose,
}: {
	/** The assignment; null keeps it closed. */
	gameId: string | null;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const groups = useQuery({
		...trpc.group.assignableGroups.queryOptions({ gameId: gameId ?? "" }),
		enabled: gameId !== null,
		staleTime: 0,
	});

	return (
		<AssignToGroupsDialog
			open={gameId !== null}
			groups={groups.isFetching ? undefined : groups.data?.groups}
			onAssign={(groupIds) =>
				mutations.assignToGroups.mutateAsync({
					gameId: gameId ?? "",
					groupIds,
				})
			}
			onClose={onClose}
		/>
	);
}
