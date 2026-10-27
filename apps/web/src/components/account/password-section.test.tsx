import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { PasswordSection } from "./password-section";

const account = {
	userId: "ana",
	email: "ana@quizio.test",
	photoUrl: null,
	hasPassword: true,
};

async function setup(
	onChange = vi.fn(async () => ({ error: null })),
	hasPassword = true,
) {
	const user = userEvent.setup();
	renderWithRouter(
		<PasswordSection
			account={{ ...account, hasPassword }}
			onChange={onChange}
		/>,
	);
	await screen.findByText("ana@quizio.test");
	return { user, onChange };
}

async function fill(
	user: ReturnType<typeof userEvent.setup>,
	current: string,
	next: string,
	repeat = next,
) {
	await user.type(screen.getByLabelText("Senha atual"), current);
	await user.type(screen.getByLabelText("Nova senha"), next);
	await user.type(screen.getByLabelText("Repita a nova senha"), repeat);
}

describe("PasswordSection (spec 039, RN-20 to RN-24)", () => {
	it("disabled until all filled", async () => {
		const { user } = await setup();
		const button = screen.getByRole("button", { name: "Alterar senha" });

		expect(button).toBeDisabled();
		await user.type(screen.getByLabelText("Senha atual"), "segredo-123");
		await user.type(screen.getByLabelText("Nova senha"), "novasenha1");
		expect(button).toBeDisabled();
		await user.type(screen.getByLabelText("Repita a nova senha"), "n");
		expect(button).toBeEnabled();
	});

	it("length, mismatch, wrong current password and too many attempts", async () => {
		const onChange = vi
			.fn()
			.mockResolvedValueOnce({
				error: { code: "INVALID_PASSWORD", status: 400 },
			})
			.mockResolvedValueOnce({ error: { status: 429 } });
		const { user } = await setup(onChange);

		await fill(user, "segredo-123", "curta12");
		await user.click(screen.getByRole("button", { name: "Alterar senha" }));
		expect(
			screen.getByText("A nova senha precisa ter de 8 a 128 caracteres."),
		).toBeVisible();

		await user.clear(screen.getByLabelText("Nova senha"));
		await user.type(screen.getByLabelText("Nova senha"), "novasenha1");
		await user.click(screen.getByRole("button", { name: "Alterar senha" }));
		expect(screen.getByText("As senhas não coincidem.")).toBeVisible();
		expect(onChange).not.toHaveBeenCalled();

		await user.clear(screen.getByLabelText("Repita a nova senha"));
		await user.type(screen.getByLabelText("Repita a nova senha"), "novasenha1");
		await user.click(screen.getByRole("button", { name: "Alterar senha" }));
		expect(
			await screen.findByText("A senha atual está incorreta."),
		).toBeVisible();

		await user.click(screen.getByRole("button", { name: "Alterar senha" }));
		expect(
			await screen.findByText("Muitas tentativas. Tente de novo em instantes."),
		).toBeVisible();
	});

	it("clears the fields on success and sends revokeOtherSessions", async () => {
		const { user, onChange } = await setup();

		await fill(user, "segredo-123", "novasenha1");
		await user.click(screen.getByRole("button", { name: "Alterar senha" }));

		expect(onChange).toHaveBeenCalledWith({
			currentPassword: "segredo-123",
			newPassword: "novasenha1",
		});
		expect(await screen.findByLabelText("Senha atual")).toHaveValue("");
		expect(screen.getByLabelText("Nova senha")).toHaveValue("");
	});

	it("the eye shows and hides each field", async () => {
		const { user } = await setup();
		const current = screen.getByLabelText("Senha atual");

		expect(current).toHaveAttribute("type", "password");
		await user.click(
			screen.getByRole("button", { name: "Mostrar a senha atual" }),
		);
		expect(current).toHaveAttribute("type", "text");
	});

	it("Google-only shows the notice", async () => {
		await setup(undefined, false);

		expect(
			screen.getByText("Você entra com o Google. Esta conta não tem senha."),
		).toBeVisible();
		expect(screen.queryByLabelText("Senha atual")).toBeNull();
	});
});
