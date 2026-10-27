import type { GroupSection } from "@quizio/core/groups/domain/group-section";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { PlusIcon, UserIcon, UsersIcon } from "lucide-react";

import type { RecentGroupData } from "@/lib/api-types";

export const GROUP_SECTION_LABELS: Record<GroupSection, string> = {
	managed: "Grupos que gerencio",
	joined: "Grupos em que participo",
};

const SECTIONS = [
	{ section: "managed", icon: UsersIcon },
	{ section: "joined", icon: UserIcon },
] as const;

const itemClasses =
	"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors";

/**
 * The column beside the groups' screens (spec 034, RN-07, RN-10): the two
 * sections, "Grupos recentes" and "Criar grupo +".
 */
export function GroupsColumn({
	section,
	recent,
	activeGroupId,
	onCreate,
}: {
	/** The open section; null on a group's screens. */
	section: GroupSection | null;
	recent: readonly RecentGroupData[];
	activeGroupId?: string;
	onCreate: () => void;
}) {
	return (
		<aside className="flex w-56 shrink-0 flex-col gap-4">
			<nav aria-label="Seções dos grupos">
				<ul className="flex flex-col gap-1">
					{SECTIONS.map(({ section: item, icon: Icon }) => {
						const current = item === section;
						return (
							<li key={item}>
								<Link
									to="/groups"
									search={{ section: item }}
									aria-current={current ? "page" : undefined}
									className={cn(
										itemClasses,
										current
											? "bg-primary/10 font-semibold text-primary"
											: "hover:bg-muted",
									)}
								>
									<Icon aria-hidden="true" className="size-4 shrink-0" />
									{GROUP_SECTION_LABELS[item]}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
			<div className="flex flex-col gap-1 border-border border-t pt-4">
				{recent.length > 0 && (
					<nav aria-labelledby="recent-groups-title">
						<h2
							id="recent-groups-title"
							className="px-3 pb-1 font-semibold text-sm"
						>
							Grupos recentes
						</h2>
						<ul className="flex flex-col gap-1">
							{recent.map((group) => {
								const current = group.id === activeGroupId;
								return (
									<li key={group.id}>
										<Link
											to="/groups/$groupId"
											params={{ groupId: group.id }}
											aria-current={current ? "page" : undefined}
											className={cn(
												itemClasses,
												"truncate font-semibold",
												current
													? "bg-primary/10 text-primary"
													: "hover:bg-muted",
											)}
										>
											{group.name}
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>
				)}
				<button
					type="button"
					onClick={onCreate}
					aria-label="Criar grupo"
					className={cn(itemClasses, "text-muted-foreground hover:bg-muted")}
				>
					Criar grupo
					<PlusIcon aria-hidden="true" className="size-4" />
				</button>
			</div>
		</aside>
	);
}

/** The two sections as tabs, on narrow screens (spec 034, Experiência). */
export function GroupSectionTabs({ section }: { section: GroupSection }) {
	return (
		<TabNav aria-label="Seções dos grupos">
			{SECTIONS.map(({ section: item }) => (
				<TabNavItem
					key={item}
					current={item === section}
					render={<Link to="/groups" search={{ section: item }} />}
				>
					{GROUP_SECTION_LABELS[item]}
				</TabNavItem>
			))}
		</TabNav>
	);
}
