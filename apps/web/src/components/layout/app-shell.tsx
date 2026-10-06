import { cn } from "@quizio/ui/lib/utils";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { MainNav } from "@/components/layout/main-nav";
import { TopBar } from "@/components/layout/top-bar";

/**
 * Chrome shared by every creator screen (spec 002): sidebar with the areas,
 * top bar with search and Criar, and the page content. On a wide screen the
 * top bar and the sidebar stay where they are and only the content scrolls,
 * as in Kahoot; on a narrow one the whole page scrolls.
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
	const content = useRef<HTMLElement>(null);

	// The content keeps its own scroll, so another page starts from its top.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset per page
	useEffect(() => {
		if (content.current) {
			content.current.scrollTop = 0;
		}
	}, [pathname]);

	return (
		<div className="grid min-h-svh grid-rows-[auto_1fr] md:h-svh md:overflow-hidden">
			<TopBar
				navOpen={navOpen}
				onToggleNav={() => setNavOpen((open) => !open)}
				navId={navId}
			/>

			<div className="grid md:min-h-0 md:grid-cols-[15rem_1fr]">
				{/* On narrow screens the sidebar is a disclosure panel (RN-08). */}
				<aside
					id={navId}
					className={cn(
						"border-border bg-card px-3 py-4 md:block md:overflow-y-auto md:border-r",
						navOpen ? "block border-b" : "hidden",
					)}
				>
					<MainNav pathname={pathname} onNavigate={() => setNavOpen(false)} />
				</aside>

				{/* `relative`: an absolutely placed descendant (the hidden input of
				    a checkbox far down a list) must scroll with the content, or it
				    makes the page itself taller and a second scrollbar shows. */}
				<main
					ref={content}
					className="relative min-w-0 px-4 py-6 md:overflow-y-auto"
				>
					{children}
				</main>
			</div>
		</div>
	);
}
