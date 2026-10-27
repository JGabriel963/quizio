import { GROUP_SECTIONS } from "@quizio/core/groups/domain/group-section";
import { Button } from "@quizio/ui/components/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { useOpenCreateGroup } from "@/components/groups/create-group-context";
import { GroupGrid, GroupGridSkeleton } from "@/components/groups/group-grid";
import {
	GROUP_SECTION_LABELS,
	GroupSectionTabs,
} from "@/components/groups/groups-column";
import { GroupsEmptyState } from "@/components/groups/groups-empty-state";
import { LibrarySearch } from "@/components/library/library-search";
import { useTRPC } from "@/utils/trpc";

const groupsSearchSchema = z.object({
	section: z.enum(GROUP_SECTIONS).catch("managed").default("managed"),
	q: z.string().optional(),
});

export const Route = createFileRoute("/_auth/_shell/groups/")({
	validateSearch: groupsSearchSchema,
	component: GroupsPage,
});

/** "Grupos que gerencio" and "Grupos em que participo" (spec 034, RN-07 to RN-09). */
function GroupsPage() {
	const { section, q = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const openCreate = useOpenCreateGroup();
	const groups = useQuery({
		...trpc.group.list.queryOptions({ section, search: q || undefined }),
		placeholderData: keepPreviousData,
	});
	const items = groups.data?.items ?? [];

	return (
		<div className="flex flex-col gap-6">
			<div className="lg:hidden">
				<GroupSectionTabs section={section} />
			</div>
			<h1 className="font-bold text-2xl">{GROUP_SECTION_LABELS[section]}</h1>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<LibrarySearch
					label="Pesquisar grupos"
					value={q}
					onSearch={(value) =>
						navigate({
							search: { section, q: value.trim() || undefined },
							replace: true,
						})
					}
				/>
				<Button onClick={openCreate}>Criar grupo</Button>
			</div>

			{groups.isPending ? (
				<GroupGridSkeleton />
			) : groups.isError ? (
				<div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-12 text-center shadow-sm">
					<p className="font-semibold">Não foi possível carregar os grupos.</p>
					<Button variant="outline" onClick={() => groups.refetch()}>
						Tentar novamente
					</Button>
				</div>
			) : items.length === 0 ? (
				<GroupsEmptyState kind={q ? "search" : section} onCreate={openCreate} />
			) : (
				<GroupGrid groups={items} />
			)}
		</div>
	);
}
