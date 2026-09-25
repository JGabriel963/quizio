import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryTabs } from "@/components/library/library-tabs";
import { renderWithRouter } from "@/testing/render-with-router";

async function renderTabs(active: "recent" | "drafts" | "trash") {
	renderWithRouter(<LibraryTabs active={active} />);
	return await screen.findByRole("navigation", {
		name: "Seções da biblioteca",
	});
}

describe("LibraryTabs", () => {
	it("renders Recentes, Rascunhos and Lixeira as links to their sections", async () => {
		const tabs = await renderTabs("recent");

		const links = within(tabs).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"Recentes",
			"Rascunhos",
			"Lixeira",
		]);
		expect(links[1]).toHaveAttribute("href", "/library?section=drafts");
	});

	it("marks the open section as current", async () => {
		const tabs = await renderTabs("trash");

		expect(within(tabs).getByRole("link", { name: "Lixeira" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			within(tabs).getByRole("link", { name: "Recentes" }),
		).not.toHaveAttribute("aria-current");
	});
});
