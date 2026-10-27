import { Button } from "@quizio/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import { useState } from "react";

import { GroupDetailsDialog } from "@/components/groups/group-details-dialog";
import { GroupSettingsPanel } from "@/components/groups/group-settings";
import {
	GroupAdminOnly,
	GroupLoadError,
	GroupNotFound,
	GroupSkeleton,
} from "@/components/groups/group-states";
import { isGroupNotFound, isNotGroupAdmin } from "@/lib/group-error-messages";
import { useGroupMutations } from "@/lib/group-mutations";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/_shell/groups/$groupId/settings")({
	component: GroupSettingsPage,
});

/** "Configurações do grupo" (spec 035, RN-01 to RN-03). */
function GroupSettingsPage() {
	const { groupId } = Route.useParams();
	const trpc = useTRPC();
	const mutations = useGroupMutations();
	const [editing, setEditing] = useState(false);
	const settings = useQuery({
		...trpc.group.settings.get.queryOptions({ groupId }),
		retry: (failureCount, error) =>
			!isGroupNotFound(error) && !isNotGroupAdmin(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	});

	const back = (
		<Button
			variant="outline"
			size="icon"
			aria-label="Voltar para o grupo"
			nativeButton={false}
			render={<Link to="/groups/$groupId" params={{ groupId }} />}
		>
			<ChevronLeftIcon />
		</Button>
	);

	let content: React.ReactNode;
	if (settings.isPending) {
		content = <GroupSkeleton />;
	} else if (settings.isError) {
		content = isNotGroupAdmin(settings.error) ? (
			<GroupAdminOnly groupId={groupId} />
		) : isGroupNotFound(settings.error) ? (
			<GroupNotFound />
		) : (
			<GroupLoadError onRetry={() => settings.refetch()} />
		);
	} else {
		content = (
			<GroupSettingsPanel
				settings={settings.data}
				onToggle={(permission, value) =>
					mutations.setPermission.mutateAsync({ groupId, permission, value })
				}
				onEditDetails={() => setEditing(true)}
			/>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
			<div className="flex items-center gap-3">
				{back}
				<h1 className="font-bold text-2xl">Configurações do grupo</h1>
			</div>
			{content}
			<GroupDetailsDialog
				details={editing && settings.data ? settings.data : null}
				onClose={() => setEditing(false)}
				onSave={(details) =>
					mutations.updateDetails.mutateAsync({ groupId, ...details })
				}
			/>
		</div>
	);
}
