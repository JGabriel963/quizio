import { useQuery } from "@tanstack/react-query";

import { useGroupMutations } from "@/lib/group-mutations";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

import { InviteDialog } from "./invite-dialog";

/**
 * The invite dialog wired to the API: the code is read only while it is open,
 * and only the admin opens it (spec 034, RN-22).
 */
export function GroupInviteControl({
	groupId,
	open,
	onClose,
}: {
	groupId: string;
	open: boolean;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const origin = useOrigin();
	const mutations = useGroupMutations();
	const invite = useQuery({
		...trpc.group.invite.get.queryOptions({ groupId }),
		enabled: open,
	});

	return (
		<InviteDialog
			open={open}
			onClose={onClose}
			origin={origin ?? ""}
			code={origin ? (invite.data?.code ?? null) : null}
			onReset={() => mutations.resetInvite.mutateAsync({ groupId })}
		/>
	);
}
