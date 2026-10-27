import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { SettingsLayout } from "./settings-layout";

describe("SettingsLayout (spec 039, RN-03)", () => {
	it("Seu perfil, Acesso à IA, Senha and Exclusão de conta, the open one from the address", async () => {
		renderWithRouter(
			<SettingsLayout section="password">
				<p>Conteúdo</p>
			</SettingsLayout>,
		);

		const nav = await screen.findByRole("navigation", {
			name: "Configurações",
		});
		const links = within(nav).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"Seu perfil",
			"Acesso à IA",
			"Senha",
			"Exclusão de conta",
		]);
		expect(links[2]).toHaveAttribute("aria-current", "page");
		expect(links[2]).toHaveAttribute("href", "/settings?section=password");
		expect(links[0]).not.toHaveAttribute("aria-current");
		expect(
			screen.getByRole("heading", { level: 1, name: "Senha" }),
		).toBeVisible();
		expect(screen.getByText("Conteúdo")).toBeVisible();
	});
});
