import { Button } from "@quizio/ui/components/button";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";

/** A group's tabs, in this order (spec 034, RN-14). */
export const GROUP_TABS = ["activity", "shared", "assignments"] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

export const GROUP_TAB_LABELS: Record<GroupTab, string> = {
	activity: "Atividade",
	shared: "Compartilhado",
	assignments: "Atribuições",
};

/** The tabs, with "Adicionar membros" for the admin on the same line (RN-16). */
export function GroupTabs({
	groupId,
	tab,
	isAdmin,
	onAddMembers,
}: {
	groupId: string;
	tab: GroupTab;
	isAdmin: boolean;
	onAddMembers: () => void;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-3">
			<TabNav aria-label="Seções do grupo">
				{GROUP_TABS.map((item) => (
					<TabNavItem
						key={item}
						current={item === tab}
						render={
							<Link
								to="/groups/$groupId"
								params={{ groupId }}
								search={{ tab: item }}
							/>
						}
					>
						{GROUP_TAB_LABELS[item]}
					</TabNavItem>
				))}
			</TabNav>
			{isAdmin && <Button onClick={onAddMembers}>Adicionar membros</Button>}
		</div>
	);
}
