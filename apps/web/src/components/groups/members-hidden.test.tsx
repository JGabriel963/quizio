import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { GroupAdminOnly, MembersHidden } from "./group-states";

describe("group states (spec 035)", () => {
	it("tells O administrador ocultou a lista de membros. with the way back (RN-13)", async () => {
		renderWithRouter(<MembersHidden groupId="g1" />);

		expect(
			await screen.findByText("O administrador ocultou a lista de membros."),
		).toBeVisible();
		expect(
			screen.getByText("Voltar para o grupo").closest("a"),
		).toHaveAttribute("href", "/groups/g1");
	});

	it("tells a member only the admin changes the settings (RN-02)", async () => {
		renderWithRouter(<GroupAdminOnly groupId="g1" />);

		expect(
			await screen.findByText(
				"Só o administrador do grupo pode mudar as configurações.",
			),
		).toBeVisible();
	});
});
