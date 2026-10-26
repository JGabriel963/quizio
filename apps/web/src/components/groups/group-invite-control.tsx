import { useQuery } from "@tanstack/react-query";

import { useGroupMutations } from "@/lib/group-mutations";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

import { InviteDialog } from "./invite-dialog";

/**
 * The invite dialog wired to the API: the code is read only while it is open,
 * by whoever may invite (spec 034, RN-22; spec 035, RN-11).
 */
export function GroupInviteControl({
	groupId,
	open,
	onClose,
	canReset,
}: {
	groupId: string;
	open: boolean;
	/** The admin's only (spec 035, RN-11). */
	canReset: boolean;
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
			canReset={canReset}
			onReset={() => mutations.resetInvite.mutateAsync({ groupId })}
		/>
	);
}
