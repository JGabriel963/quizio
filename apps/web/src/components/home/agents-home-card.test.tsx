import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AgentsHomeCard } from "./agents-home-card";

describe("AgentsHomeCard (spec 044)", () => {
	it("tells what an agent can do and leads to Agentes de IA", async () => {
		renderWithRouter(<AgentsHomeCard />);

		const card = await screen.findByRole("region", {
			name: "Seu agente de IA no Quizio",
		});
		expect(card).toHaveTextContent(
			"Peça ao ChatGPT, ao Claude ou a outro agente para criar quizzes, organizar grupos e ler relatórios por você.",
		);
		// A link styled as a button keeps the button's role.
		expect(
			screen.getByRole("button", { name: "Conectar um agente" }).closest("a"),
		).toHaveAttribute("href", "/settings?section=agents");
	});
});
