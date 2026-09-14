import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SignUpForm, type SignUpFormProps } from "./sign-up-form";

function renderForm(overrides: Partial<SignUpFormProps> = {}) {
	const props: SignUpFormProps = {
		signUpEnabled: true,
		googleEnabled: false,
		onSignUp: vi.fn(async () => ({ error: null })),
		onGoogleSignIn: vi.fn(),
		onSwitchToSignIn: vi.fn(),
		...overrides,
	};
	render(<SignUpForm {...props} />);
	return props;
}

async function fillAndSubmit(fields: {
	name: string;
	email: string;
	password: string;
}) {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Nome"), fields.name);
	await user.type(screen.getByLabelText("E-mail"), fields.email);
	await user.type(screen.getByLabelText("Senha"), fields.password);
	await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("SignUpForm", () => {
	it("shows a message for each invalid field", async () => {
		const props = renderForm();

		await fillAndSubmit({ name: "A", email: "ana@", password: "1234567" });

		expect(
			await screen.findByText("O nome deve ter entre 2 e 50 caracteres."),
		).toBeInTheDocument();
		expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
		expect(
			screen.getByText("A senha deve ter pelo menos 8 caracteres."),
		).toBeInTheDocument();
		expect(props.onSignUp).not.toHaveBeenCalled();
	});

	it("submits trimmed values when the fields are valid", async () => {
		const props = renderForm();

		await fillAndSubmit({
			name: "  Ana Souza ",
			email: " ana@exemplo.com ",
			password: "12345678",
		});

		expect(props.onSignUp).toHaveBeenCalledWith({
			name: "Ana Souza",
			email: "ana@exemplo.com",
			password: "12345678",
		});
	});

	it("shows the server error in Portuguese", async () => {
		renderForm({
			onSignUp: vi.fn(async () => ({ error: { code: "USER_ALREADY_EXISTS" } })),
		});

		await fillAndSubmit({
			name: "Ana",
			email: "ana@exemplo.com",
			password: "12345678",
		});

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este e-mail já está em uso.",
		);
	});

	it("shows the closed notice instead of the form when sign-up is disabled", () => {
		renderForm({ signUpEnabled: false, googleEnabled: true });

		expect(
			screen.getByText("Novos cadastros estão fechados no momento."),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Criar conta" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Continuar com Google" }),
		).toBeNull();
	});

	it("offers Google sign-up when Google is enabled", async () => {
		const props = renderForm({ googleEnabled: true });

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Continuar com Google" }));

		expect(props.onGoogleSignIn).toHaveBeenCalledOnce();
	});
});
