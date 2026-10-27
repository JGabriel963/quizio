import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";

export function memberCountLabel(count: number): string {
	return count === 1 ? "1 membro" : `${count} membros`;
}

/** The groups of a section, as cards (spec 034, RN-08). */
export function GroupGrid({
	groups,
}: {
	groups: readonly { id: string; name: string; memberCount: number }[];
}) {
	return (
		<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{groups.map((group) => (
				<li key={group.id}>
					<Link
						to="/groups/$groupId"
						params={{ groupId: group.id }}
						className="flex h-full flex-col gap-3 rounded-lg bg-card p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
					>
						<span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
							<UsersIcon aria-hidden="true" className="size-5" />
						</span>
						<span className="truncate font-bold">{group.name}</span>
						<span className="text-muted-foreground text-sm">
							{memberCountLabel(group.memberCount)}
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

export function GroupGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{["a", "b", "c"].map((key) => (
				<Skeleton key={key} className="h-32 rounded-lg" />
			))}
		</div>
	);
}
