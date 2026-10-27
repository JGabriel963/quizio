import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { GroupsColumn } from "./groups-column";

describe("GroupsColumn (spec 034)", () => {
	it("links both sections and highlights the open one", async () => {
		renderWithRouter(
			<GroupsColumn section="joined" recent={[]} onCreate={() => {}} />,
		);

		const managed = await screen.findByRole("link", {
			name: "Grupos que gerencio",
		});
		const joined = screen.getByRole("link", {
			name: "Grupos em que participo",
		});

		expect(managed).toHaveAttribute("href", "/groups?section=managed");
		expect(joined).toHaveAttribute("href", "/groups?section=joined");
		expect(joined).toHaveAttribute("aria-current", "page");
		expect(managed).not.toHaveAttribute("aria-current");
	});

	it("hides Grupos recentes without visits", async () => {
		renderWithRouter(
			<GroupsColumn section="managed" recent={[]} onCreate={() => {}} />,
		);

		await screen.findByRole("link", { name: "Grupos que gerencio" });
		expect(screen.queryByText("Grupos recentes")).toBeNull();
	});

	it("shows Grupos recentes, highlighting the open group", async () => {
		renderWithRouter(
			<GroupsColumn
				section={null}
				activeGroupId="g2"
				recent={[
					{ id: "g2", name: "Coral" },
					{ id: "g1", name: "Turma 7A" },
				]}
				onCreate={() => {}}
			/>,
		);

		const recent = await screen.findByRole("navigation", {
			name: "Grupos recentes",
		});
		const links = within(recent).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"Coral",
			"Turma 7A",
		]);
		expect(links[0]).toHaveAttribute("href", "/groups/g2");
		expect(links[0]).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("link", { name: "Grupos que gerencio" }),
		).not.toHaveAttribute("aria-current");
	});

	it("Criar grupo + opens the dialog", async () => {
		const user = userEvent.setup();
		const onCreate = vi.fn();
		renderWithRouter(
			<GroupsColumn section="managed" recent={[]} onCreate={onCreate} />,
		);

		await user.click(
			await screen.findByRole("button", { name: "Criar grupo" }),
		);

		expect(onCreate).toHaveBeenCalled();
	});
});
