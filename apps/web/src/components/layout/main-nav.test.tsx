import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { activeMainNavLabel, MainNav } from "@/components/layout/main-nav";
import { renderWithRouter } from "@/testing/render-with-router";

async function renderNav(pathname: string) {
	renderWithRouter(<MainNav pathname={pathname} />);
	return await screen.findByRole("navigation", {
		name: "Navegação principal",
	});
}

describe("activeMainNavLabel", () => {
	it.each([
		["/", "Início"],
		["/library", "Biblioteca"],
		["/library/", "Biblioteca"],
		["/quizzes/quiz-1", "Biblioteca"],
		["/login", null],
	])("marks %s as %s", (pathname, label) => {
		expect(activeMainNavLabel(pathname)).toBe(label);
	});
});

describe("MainNav", () => {
	it("renders Início, Biblioteca, Relatórios, Descobrir and Grupos in order", async () => {
		const nav = await renderNav("/");

		const labels = within(nav)
			.getAllByRole("listitem")
			.map((item) => item.textContent?.replace("Em breve", "").trim());

		expect(labels).toEqual([
			"Início",
			"Biblioteca",
			"Relatórios",
			"Descobrir",
			"Grupos",
		]);
	});

	it("renders coming soon items as non-links labelled Em breve", async () => {
		await renderNav("/");

		expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
			["Início", "Biblioteca"],
		);
		for (const label of ["Relatórios", "Descobrir", "Grupos"]) {
			const item = screen.getByText(label).closest("li") as HTMLElement;

			expect(within(item).getByText("Em breve")).toBeVisible();
			expect(item.querySelector("a")).toBeNull();
			expect(item.querySelector('[aria-disabled="true"]')).not.toBeNull();
		}
	});

	it("marks the active area with aria-current", async () => {
		await renderNav("/");

		expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			screen.getByRole("link", { name: "Biblioteca" }),
		).not.toHaveAttribute("aria-current");
	});
});
