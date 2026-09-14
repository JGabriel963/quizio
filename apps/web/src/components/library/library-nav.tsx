import type { LibrarySection } from "@quizio/core/library/domain/library-section";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ClockIcon,
	FileTextIcon,
	type LucideIcon,
	Trash2Icon,
} from "lucide-react";

const SECTIONS: ReadonlyArray<{
	section: LibrarySection;
	label: string;
	icon: LucideIcon;
}> = [
	{ section: "recent", label: "Recentes", icon: ClockIcon },
	{ section: "drafts", label: "Rascunhos", icon: FileTextIcon },
	{ section: "trash", label: "Lixeira", icon: Trash2Icon },
];

export const LIBRARY_SECTION_LABELS: Record<LibrarySection, string> = {
	recent: "Recentes",
	drafts: "Rascunhos",
	trash: "Lixeira",
};

export function LibraryNav({ active }: { active: LibrarySection }) {
	return (
		<nav aria-label="Seções da biblioteca">
			<ul className="flex gap-1 md:flex-col">
				{SECTIONS.map(({ section, label, icon: Icon }) => (
					<li key={section}>
						<Link
							to="/library"
							search={{ section }}
							aria-current={active === section ? "page" : undefined}
							className={cn(
								"flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-sm transition-colors",
								active === section
									? "bg-sidebar-primary text-sidebar-primary-foreground"
									: "text-foreground hover:bg-muted",
							)}
						>
							<Icon aria-hidden="true" className="size-4" />
							{label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
