import type { LibrarySection } from "@quizio/core/library/domain/library-section";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";

export const LIBRARY_SECTION_LABELS: Record<LibrarySection, string> = {
	recent: "Recentes",
	drafts: "Rascunhos",
	trash: "Lixeira",
};

const SECTIONS: readonly LibrarySection[] = ["recent", "drafts", "trash"];

/** Sections of the library as tabs (spec 002, RN-22); each one is a real URL (RN-23). */
export function LibraryTabs({ active }: { active: LibrarySection }) {
	return (
		<TabNav aria-label="Seções da biblioteca">
			{SECTIONS.map((section) => (
				<TabNavItem
					key={section}
					current={section === active}
					render={<Link to="/library" search={{ section }} />}
				>
					{LIBRARY_SECTION_LABELS[section]}
				</TabNavItem>
			))}
		</TabNav>
	);
}
