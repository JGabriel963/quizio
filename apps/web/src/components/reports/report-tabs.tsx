import type { ReportSection } from "@quizio/core/reports/domain/report";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
	reports: "Relatórios",
	trash: "Lixeira",
};

const SECTIONS: readonly ReportSection[] = ["reports", "trash"];

/** The reports' sections as tabs, as in the library (spec 015, RN-22). */
export function ReportTabs({ active }: { active: ReportSection }) {
	return (
		<TabNav aria-label="Seções dos relatórios">
			{SECTIONS.map((section) => (
				<TabNavItem
					key={section}
					current={section === active}
					render={<Link to="/reports" search={{ section }} />}
				>
					{REPORT_SECTION_LABELS[section]}
				</TabNavItem>
			))}
		</TabNav>
	);
}
