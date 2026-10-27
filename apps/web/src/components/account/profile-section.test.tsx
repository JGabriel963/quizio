import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { ProfileSection } from "./profile-section";

const account = {
	userId: "ana",
	name: "João",
	email: "ana@quizio.test",
	photoUrl: null,
};

async function setup(onRename = vi.fn(async () => {})) {
	const user = userEvent.setup();
	const onOpenPhoto = vi.fn();
	renderWithRouter(
		<ProfileSection
			account={account}
			onRename={onRename}
			onOpenPhoto={onOpenPhoto}
		/>,
	);
	const name = await screen.findByRole("textbox", { name: "Nome" });
	return { user, name, onRename, onOpenPhoto };
}

describe("ProfileSection (spec 039, RN-12 to RN-16)", () => {
	it("Alterar is disabled until the name changes", async () => {
		const { user, name, onRename } = await setup();
		const change = screen.getByRole("button", { name: "Alterar" });

		expect(change).toBeDisabled();
		await user.clear(name);
		await user.type(name, "João Gabriel");
		expect(change).toBeEnabled();
		await user.click(change);

		expect(onRename).toHaveBeenCalledWith("João Gabriel");
	});

	it("shows the length message for 1 and 51 characters", async () => {
		const { user, name, onRename } = await setup();

		await user.clear(name);
		await user.type(name, "J");
		await user.click(screen.getByRole("button", { name: "Alterar" }));
		expect(
			screen.getByText("O nome precisa ter de 2 a 50 caracteres."),
		).toBeVisible();

		await user.clear(name);
		await user.type(name, "a".repeat(51));
		await user.click(screen.getByRole("button", { name: "Alterar" }));

		expect(onRename).not.toHaveBeenCalled();
	});

	it("email is read only", async () => {
		await setup();

		const email = screen.getByRole("textbox", { name: "E-mail" });
		expect(email).toHaveValue("ana@quizio.test");
		expect(email).toHaveAttribute("readonly");
		expect(screen.getAllByRole("button", { name: "Alterar" })).toHaveLength(1);
	});

	it("Enter saves", async () => {
		const { user, name, onRename } = await setup();

		await user.clear(name);
		await user.type(name, "  João Gabriel  {Enter}");

		expect(onRename).toHaveBeenCalledWith("João Gabriel");
	});

	it("Adicionar foto opens the photo dialog, and Ver perfil goes to the profile", async () => {
		const { user, onOpenPhoto } = await setup();

		await user.click(screen.getByRole("button", { name: "Adicionar foto" }));

		expect(onOpenPhoto).toHaveBeenCalledOnce();
		expect(screen.getByText("Ver perfil").closest("a")).toHaveAttribute(
			"href",
			"/profile/ana",
		);
	});
});
