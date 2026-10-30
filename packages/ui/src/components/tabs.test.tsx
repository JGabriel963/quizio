import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Example() {
	return (
		<Tabs defaultValue="claude">
			<TabsList aria-label="Agentes">
				<TabsTrigger value="claude">Claude</TabsTrigger>
				<TabsTrigger value="codex">Codex</TabsTrigger>
			</TabsList>
			<TabsContent value="claude">Passos do Claude</TabsContent>
			<TabsContent value="codex">Passos do Codex</TabsContent>
		</Tabs>
	);
}

describe("Tabs", () => {
	it("pill variant marks the selected tab (spec 047)", async () => {
		const user = userEvent.setup();
		render(
			<Tabs defaultValue="greek">
				<TabsList variant="pill" aria-label="Símbolos">
					<TabsTrigger variant="pill" value="greek">
						Grego
					</TabsTrigger>
					<TabsTrigger variant="pill" value="other">
						Outro
					</TabsTrigger>
				</TabsList>
			</Tabs>,
		);
		const other = screen.getByRole("tab", { name: "Outro" });

		await user.click(other);

		expect(other).toHaveAttribute("aria-selected", "true");
		expect(other.className).toContain("data-[active]:bg-primary");
		expect(screen.getByRole("tablist").className).toContain("bg-transparent");
	});

	it("switches panels with the mouse and the arrow keys and exposes a tablist", async () => {
		const user = userEvent.setup();
		render(<Example />);

		expect(
			screen.getByRole("tablist", { name: "Agentes" }),
		).toBeInTheDocument();
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Passos do Claude");

		await user.click(screen.getByRole("tab", { name: "Codex" }));
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Passos do Codex");
		expect(screen.getByRole("tab", { name: "Codex" })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		await user.keyboard("{ArrowLeft}");
		expect(screen.getByRole("tab", { name: "Claude" })).toHaveFocus();
	});

	it("marks the slots for the design system", () => {
		render(<Example />);

		expect(screen.getByRole("tablist")).toHaveAttribute(
			"data-slot",
			"tabs-list",
		);
		expect(screen.getByRole("tab", { name: "Claude" })).toHaveAttribute(
			"data-slot",
			"tabs-trigger",
		);
	});
});
