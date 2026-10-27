import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AccountMenuView } from "./account-menu";

const account = {
	userId: "ana",
	name: "Ana Clara",
	email: "ana@quizio.test",
	photoUrl: null,
};

describe("AccountMenuView (spec 039, RN-01, RN-02)", () => {
	it("photo trigger, name, email, Ver perfil, Configurações and Encerrar sessão only", async () => {
		const user = userEvent.setup();
		const onSignOut = vi.fn();
		renderWithRouter(
			<AccountMenuView account={account} onSignOut={onSignOut} />,
		);

		const trigger = await screen.findByRole("button", { name: "Ana Clara" });
		expect(trigger.querySelector('[data-slot="user-avatar"]')).not.toBeNull();
		await user.click(trigger);

		const menu = await screen.findByRole("menu");
		expect(within(menu).getByText("Ana Clara")).toBeVisible();
		expect(within(menu).getByText("ana@quizio.test")).toBeVisible();
		expect(
			within(menu).getByRole("menuitem", { name: "Ver perfil" }),
		).toHaveAttribute("href", "/profile/ana");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent?.trim()),
		).toEqual(["Ver perfil", "Configurações", "Encerrar sessão"]);
		expect(
			within(menu).getByRole("menuitem", { name: "Configurações" }),
		).toHaveAttribute("href", "/settings?section=profile");

		await user.click(
			within(menu).getByRole("menuitem", { name: "Encerrar sessão" }),
		);
		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("shows the photo in the trigger", async () => {
		renderWithRouter(
			<AccountMenuView
				account={{ ...account, photoUrl: "https://media.test/p.webp" }}
				onSignOut={() => {}}
			/>,
		);

		const trigger = await screen.findByRole("button", { name: "Ana Clara" });
		expect(trigger.querySelector("img")).toHaveAttribute(
			"src",
			"https://media.test/p.webp",
		);
	});
});
