import { Button } from "@quizio/ui/components/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { RemoveMemberDialog } from "@/components/groups/confirm-group-dialogs";
import { GroupInviteControl } from "@/components/groups/group-invite-control";
import {
	GroupLoadError,
	GroupNotFound,
	GroupSkeleton,
} from "@/components/groups/group-states";
import { MemberInfoDialog } from "@/components/groups/member-info-dialog";
import { MembersTable } from "@/components/groups/members-table";
import { LibrarySearch } from "@/components/library/library-search";
import type { GroupMemberData } from "@/lib/api-types";
import { isGroupNotFound } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/_shell/groups/$groupId/members")({
	validateSearch: z.object({ q: z.string().optional() }),
	component: GroupMembersPage,
});

/** "Membros do grupo" (spec 034, RN-31 to RN-35). */
function GroupMembersPage() {
	const { groupId } = Route.useParams();
	const { q = "" } = Route.useSearch();
	const { session } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const [info, setInfo] = useState<GroupMemberData | null>(null);
	const [removing, setRemoving] = useState<GroupMemberData | null>(null);
	const [inviting, setInviting] = useState(false);
	const notFoundRetry = (failureCount: number, error: unknown) =>
		!isGroupNotFound(error) && failureCount < 2;
	const group = useQuery({
		...trpc.group.get.queryOptions({ groupId }),
		retry: notFoundRetry,
		meta: { suppressErrorToast: true },
	});
	const members = useQuery({
		...trpc.group.members.queryOptions({ groupId, search: q || undefined }),
		placeholderData: keepPreviousData,
		retry: notFoundRetry,
		meta: { suppressErrorToast: true },
	});

	const error = group.error ?? members.error;
	if (error) {
		return isGroupNotFound(error) ? (
			<GroupNotFound />
		) : (
			<GroupLoadError
				onRetry={() => {
					void group.refetch();
					void members.refetch();
				}}
			/>
		);
	}

	if (!group.data || !members.data) {
		return <GroupSkeleton />;
	}
	const isAdmin = group.data.role === "admin";
	const { items, total } = members.data;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					size="icon"
					aria-label="Voltar para o grupo"
					nativeButton={false}
					render={<Link to="/groups/$groupId" params={{ groupId }} />}
				>
					<ChevronLeftIcon />
				</Button>
				<h1 className="font-bold text-2xl">Membros do grupo</h1>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<LibrarySearch
					label="Pesquisar membros"
					value={q}
					onSearch={(value) =>
						navigate({
							search: { q: value.trim() || undefined },
							replace: true,
						})
					}
				/>
				<p className="text-sm" aria-live="polite">
					{items.length} de {total} membros do grupo
				</p>
				{isAdmin && (
					<Button className="ml-auto" onClick={() => setInviting(true)}>
						Adicionar membros
					</Button>
				)}
			</div>
			<MembersTable
				members={items}
				viewerId={session.user.id}
				isAdmin={isAdmin}
				onInfo={setInfo}
				onRemove={setRemoving}
			/>

			<MemberInfoDialog member={info} onClose={() => setInfo(null)} />
			<RemoveMemberDialog
				name={removing?.name ?? null}
				onCancel={() => setRemoving(null)}
				onConfirm={() => {
					if (removing) {
						mutations.removeMember.mutate({ groupId, userId: removing.userId });
					}
					setRemoving(null);
				}}
			/>
			{isAdmin && (
				<GroupInviteControl
					groupId={groupId}
					open={inviting}
					onClose={() => setInviting(false)}
				/>
			)}
		</div>
	);
}
