import { Badge } from "@quizio/ui/components/badge";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ChartColumnIcon,
	CompassIcon,
	HouseIcon,
	LibraryBigIcon,
	type LucideIcon,
	UsersIcon,
} from "lucide-react";

type MainNavItem = {
	label: string;
	icon: LucideIcon;
} & (
	| { to: "/"; search?: undefined }
	| { to: "/library"; search: { section: "recent" } }
	| { to: "/reports"; search: { section: "reports" } }
	| { to?: undefined; comingSoon: true }
);

/**
 * The creator's areas, in the order of the spec (002, RN-04). Items whose
 * feature is not delivered yet stay visible and marked "Em breve" (RN-05).
 */
export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
	{ label: "Início", icon: HouseIcon, to: "/" },
	{
		label: "Biblioteca",
		icon: LibraryBigIcon,
		to: "/library",
		search: { section: "recent" },
	},
	{
		label: "Relatórios",
		icon: ChartColumnIcon,
		to: "/reports",
		search: { section: "reports" },
	},
	{ label: "Descobrir", icon: CompassIcon, comingSoon: true },
	{ label: "Grupos", icon: UsersIcon, comingSoon: true },
];

/**
 * Which area a path belongs to (RN-06). A quiz page has no item of its own, so
 * it keeps Biblioteca marked; anything outside the creator's areas marks none.
 */
export function activeMainNavLabel(pathname: string): string | null {
	if (pathname === "/") {
		return "Início";
	}
	if (pathname.startsWith("/library") || pathname.startsWith("/quizzes")) {
		return "Biblioteca";
	}
	// The list and an open report (spec 015, RN-22).
	if (pathname.startsWith("/reports")) {
		return "Relatórios";
	}
	return null;
}

const itemClasses =
	"flex items-center gap-3 rounded-md px-3 py-2 font-semibold text-sm transition-colors";

export function MainNav({
	pathname,
	onNavigate,
}: {
	pathname: string;
	/** Lets the shell close the nav after a narrow-screen navigation (RN-08). */
	onNavigate?: () => void;
}) {
	return (
		<nav aria-label="Navegação principal">
			<ul className="flex flex-col gap-1">
				{MAIN_NAV_ITEMS.map((item) => {
					const Icon = item.icon;

					if (item.to === undefined) {
						return (
							<li key={item.label}>
								{/* Not a link: there is nowhere to go yet (RN-05). */}
								<span
									aria-disabled="true"
									className={cn(itemClasses, "text-muted-foreground/70")}
								>
									<Icon aria-hidden="true" className="size-5 shrink-0" />
									<span className="flex-1">{item.label}</span>
									<Badge variant="soon">Em breve</Badge>
								</span>
							</li>
						);
					}

					const active = activeMainNavLabel(pathname) === item.label;
					return (
						<li key={item.label}>
							<Link
								to={item.to}
								search={item.search}
								// Without exact, "/" would count as active on every page.
								activeOptions={item.to === "/" ? { exact: true } : undefined}
								aria-current={active ? "page" : undefined}
								onClick={onNavigate}
								className={cn(
									itemClasses,
									active
										? "bg-brand text-primary-foreground"
										: "text-foreground hover:bg-muted",
								)}
							>
								<Icon aria-hidden="true" className="size-5 shrink-0" />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
