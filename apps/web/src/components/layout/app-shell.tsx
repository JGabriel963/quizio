import { cn } from "@quizio/ui/lib/utils";
import { type ReactNode, useId, useState } from "react";

import { MainNav } from "@/components/layout/main-nav";
import { TopBar } from "@/components/layout/top-bar";

/**
 * Chrome shared by every creator screen (spec 002): sidebar with the areas,
 * top bar with search and Criar, and the page content.
 */
export function AppShell({
	pathname,
	children,
}: {
	pathname: string;
	children: ReactNode;
}) {
	const navId = useId();
	const [navOpen, setNavOpen] = useState(false);

	return (
		<div className="grid min-h-svh grid-rows-[auto_1fr]">
			<TopBar
				navOpen={navOpen}
				onToggleNav={() => setNavOpen((open) => !open)}
				navId={navId}
			/>

			<div className="grid md:grid-cols-[15rem_1fr]">
				{/* On narrow screens the sidebar is a disclosure panel (RN-08). */}
				<aside
					id={navId}
					className={cn(
						"border-border bg-card px-3 py-4 md:block md:border-r",
						navOpen ? "block border-b" : "hidden",
					)}
				>
					<MainNav pathname={pathname} onNavigate={() => setNavOpen(false)} />
				</aside>

				<main className="min-w-0 px-4 py-6">{children}</main>
			</div>
		</div>
	);
}
