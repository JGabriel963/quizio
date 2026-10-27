import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";

import { InviteCard } from "@/components/groups/invite-card";
import { useGroupMutations } from "@/lib/group-mutations";
import { domainCodeOf } from "@/lib/quiz-error-messages";
import { useTRPC } from "@/utils/trpc";

/**
 * The group's invite link (spec 034, RN-25 to RN-29). Under `_auth`, so a
 * visitor signs in (or signs up) and comes back here (RN-26); outside the
 * shell, as in Kahoot.
 */
export const Route = createFileRoute("/_auth/invite/$code")({
	component: InvitePage,
});

function InvitePage() {
	const { code } = Route.useParams();
	const trpc = useTRPC();
	const navigate = useNavigate();
	const mutations = useGroupMutations();
	const invitation = useQuery({
		...trpc.group.invite.find.queryOptions({ code }),
		// Answering it is a decision: no refetch behind the user's back.
		refetchOnWindowFocus: false,
	});
	const accepted = mutations.acceptInvite;
	// A link reset between the screen and the click shows as invalid (RN-29).
	const refused = domainCodeOf(accepted.error) === "GROUP.INVITE_INVALID";

	let content: React.ReactNode;
	if (invitation.isPending) {
		content = <Skeleton className="h-80 w-full max-w-lg rounded-lg" />;
	} else if (invitation.isError) {
		content = (
			<div className="flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center shadow-md">
				<p className="font-semibold">Não foi possível abrir o convite.</p>
				<Button variant="outline" onClick={() => invitation.refetch()}>
					Tentar novamente
				</Button>
			</div>
		);
	} else if (invitation.data.status === "member") {
		// Who already belongs goes straight in (RN-27).
		return (
			<Navigate
				to="/groups/$groupId"
				params={{ groupId: invitation.data.groupId }}
				replace
			/>
		);
	} else {
		content = (
			<InviteCard
				invitation={refused ? { status: "invalid" } : invitation.data}
				accepting={accepted.isPending}
				onAccept={() =>
					accepted.mutate(
						{ code },
						{
							onSuccess: ({ groupId }) =>
								navigate({
									to: "/groups/$groupId",
									params: { groupId },
									replace: true,
								}),
						},
					)
				}
			/>
		);
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
			{content}
		</main>
	);
}
