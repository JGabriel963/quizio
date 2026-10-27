import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
	ACCOUNT_SECTION_LABELS,
	ACCOUNT_SECTIONS,
	type AccountSection,
} from "@/lib/account-sections";

/**
 * Configurações (spec 039, RN-03): the column of sections beside the open
 * one, as Kahoot's; on a narrow screen the column becomes a row of tabs.
 */
export function SettingsLayout({
	section,
	children,
}: {
	section: AccountSection;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6 lg:-mx-4 lg:-my-6 lg:min-h-[calc(100%+3rem)] lg:flex-row lg:gap-0">
			<nav
				aria-label="Configurações"
				className="shrink-0 overflow-x-auto border-border border-b lg:w-56 lg:border-r lg:border-b-0 lg:bg-card lg:px-3 lg:py-4"
			>
				<ul className="flex gap-1 lg:flex-col">
					{ACCOUNT_SECTIONS.map((item) => {
						const current = item === section;
						return (
							<li key={item} className="shrink-0">
								<Link
									to="/settings"
									search={{ section: item }}
									aria-current={current ? "page" : undefined}
									className={cn(
										"flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm",
										current
											? "bg-primary/10 font-semibold text-primary"
											: "hover:bg-muted",
									)}
								>
									{ACCOUNT_SECTION_LABELS[item]}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
			<div className="min-w-0 flex-1 lg:px-8 lg:py-6">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
					<h1 className="font-bold text-2xl">
						{ACCOUNT_SECTION_LABELS[section]}
					</h1>
					{children}
				</div>
			</div>
		</div>
	);
}
