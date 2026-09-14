import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SignInForm, type SignInFormProps } from "./sign-in-form";

function renderForm(overrides: Partial<SignInFormProps> = {}) {
	const props: SignInFormProps = {
		googleEnabled: false,
		onSignIn: vi.fn(async () => ({ error: null })),
		onGoogleSignIn: vi.fn(),
		onSwitchToSignUp: vi.fn(),
		...overrides,
	};
	render(<SignInForm {...props} />);
	return props;
}

async function signIn(email = "ana@exemplo.com", password = "12345678") {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("E-mail"), email);
	await user.type(screen.getByLabelText("Senha"), password);
	await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("SignInForm", () => {
	it("submits the trimmed email and the password", async () => {
		const props = renderForm();

		await signIn(" ana@exemplo.com ", "12345678");

		expect(props.onSignIn).toHaveBeenCalledWith({
			email: "ana@exemplo.com",
			password: "12345678",
		});
	});

	it("shows the generic credentials message", async () => {
		renderForm({
			onSignIn: vi.fn(async () => ({
				error: { code: "INVALID_EMAIL_OR_PASSWORD" },
			})),
		});

		await signIn();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"E-mail ou senha incorretos.",
		);
	});

	it("shows the rate limit message", async () => {
		renderForm({ onSignIn: vi.fn(async () => ({ error: { status: 429 } })) });

		await signIn();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Muitas tentativas. Aguarde um pouco e tente novamente.",
		);
	});

	it("shows an error passed in from a failed Google redirect", () => {
		renderForm({ initialError: { code: "signup_disabled" } });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Novos cadastros estão fechados no momento.",
		);
	});

	it("hides the Google button when Google is disabled", () => {
		renderForm({ googleEnabled: false });

		expect(
			screen.queryByRole("button", { name: "Continuar com Google" }),
		).toBeNull();
	});

	it("starts Google sign-in when Google is enabled", async () => {
		const props = renderForm({ googleEnabled: true });

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Continuar com Google" }));

		expect(props.onGoogleSignIn).toHaveBeenCalledOnce();
	});
});
