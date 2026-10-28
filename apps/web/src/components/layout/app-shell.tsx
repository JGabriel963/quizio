import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@quizio/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { AgentsSidebarNotice } from "@/components/agents/agents-sidebar-card";
import { BrandLogo } from "@/components/layout/brand-logo";
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

			<div className="grid grid-cols-1 md:min-h-0 md:grid-cols-[15rem_1fr]">
				<aside className="hidden flex-col gap-6 border-border border-r bg-card px-3 py-4 md:flex md:overflow-y-auto">
					<MainNav pathname={pathname} />
					{/* At the foot, out of the way of the areas (spec 044). */}
					<AgentsSidebarNotice className="mt-auto" />
				</aside>

				{/* On narrow screens the sidebar opens over the page from the left,
				    as Kahoot's menu, instead of pushing the content down (RN-08). */}
				<Sheet open={navOpen} onOpenChange={setNavOpen}>
					<SheetContent
						id={navId}
						side="left"
						className="max-w-72 md:hidden"
						closeLabel="Fechar navegação"
					>
						<SheetHeader className="py-3">
							<SheetTitle className="sr-only">Navegação</SheetTitle>
							<Link
								to="/"
								onClick={() => setNavOpen(false)}
								className="font-black text-brand text-xl tracking-tight"
							>
								<BrandLogo />
							</Link>
						</SheetHeader>
						<SheetBody className="flex flex-col gap-6 px-3">
							<MainNav
								pathname={pathname}
								onNavigate={() => setNavOpen(false)}
							/>
							<AgentsSidebarNotice
								className="mt-auto"
								onNavigate={() => setNavOpen(false)}
							/>
						</SheetBody>
					</SheetContent>
				</Sheet>

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
