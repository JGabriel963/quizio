import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComingSoonCard } from "@/components/home/coming-soon-card";

describe("ComingSoonCard", () => {
	it("marks the card as coming soon and shows no data", () => {
		render(
			<ComingSoonCard title="Relatórios mais recentes">
				Os relatórios chegam com as partidas ao vivo.
			</ComingSoonCard>,
		);

		const card = screen.getByRole("region", {
			name: /Relatórios mais recentes/,
		});
		expect(within(card).getByText("Em breve")).toBeVisible();
		expect(
			within(card).getByText("Os relatórios chegam com as partidas ao vivo."),
		).toBeVisible();
		expect(within(card).queryByRole("list")).toBeNull();
		expect(within(card).queryByRole("link")).toBeNull();
	});
});
