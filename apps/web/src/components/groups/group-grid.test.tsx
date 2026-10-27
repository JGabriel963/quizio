import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { GroupGrid } from "./group-grid";

describe("GroupGrid (spec 034, RN-08)", () => {
	it("lists each group as a link with its member count", async () => {
		renderWithRouter(
			<GroupGrid
				groups={[
					{ id: "g1", name: "Turma 7A", memberCount: 1 },
					{ id: "g2", name: "Coral", memberCount: 12 },
				]}
			/>,
		);

		const first = await screen.findByRole("link", { name: /Turma 7A/ });
		expect(first).toHaveAttribute("href", "/groups/g1");
		expect(first).toHaveTextContent("1 membro");
		expect(screen.getByRole("link", { name: /Coral/ })).toHaveTextContent(
			"12 membros",
		);
	});
});
