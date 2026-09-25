import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TabNav, TabNavItem } from "./tab-nav";

function renderTabs() {
	return render(
		<TabNav aria-label="Seções da biblioteca">
			<TabNavItem current render={<a href="/library?section=recent" />}>
				Recentes
			</TabNavItem>
			<TabNavItem render={<a href="/library?section=drafts" />}>
				Rascunhos
			</TabNavItem>
		</TabNav>,
	);
}

describe("TabNav", () => {
	it("renders each item as a link inside a navigation landmark", () => {
		renderTabs();

		const nav = screen.getByRole("navigation", {
			name: "Seções da biblioteca",
		});
		expect(nav).toHaveAttribute("data-slot", "tab-nav");
		expect(screen.getAllByRole("link")).toHaveLength(2);
		expect(screen.getByRole("link", { name: "Rascunhos" })).toHaveAttribute(
			"href",
			"/library?section=drafts",
		);
	});

	it("marks the current item with aria-current", () => {
		renderTabs();

		expect(screen.getByRole("link", { name: "Recentes" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("link", { name: "Rascunhos" })).not.toHaveAttribute(
			"aria-current",
		);
	});

	it("is a navigation, never an ARIA tablist", () => {
		renderTabs();

		expect(screen.queryByRole("tablist")).toBeNull();
		expect(screen.queryByRole("tab")).toBeNull();
	});
});
