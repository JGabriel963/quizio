import { Button } from "@quizio/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { LegalConsent } from "@/components/legal/legal-consent";
import {
	type AuthErrorLike,
	authErrorMessage,
} from "@/lib/auth-error-messages";

import { AuthField } from "./auth-field";
import {
	AuthDivider,
	GoogleSignInButton,
	SocialSignIn,
} from "./social-sign-in";

export interface AuthActionResult {
	error?: AuthErrorLike | null;
}

export interface SignInFormProps {
	googleEnabled: boolean;
	/** Error carried back by a failed Google redirect (`?error=`). */
	initialError?: AuthErrorLike | null;
	onSignIn: (values: {
		email: string;
		password: string;
	}) => Promise<AuthActionResult>;
	onGoogleSignIn: () => void;
	onSwitchToSignUp: () => void;
}

const signInSchema = z.object({
	email: z
		.string()
		.trim()
		.pipe(z.email(authErrorMessage({ code: "INVALID_EMAIL" }))),
	password: z.string().min(1, "Informe a senha."),
});

export function SignInForm({
	googleEnabled,
	initialError = null,
	onSignIn,
	onGoogleSignIn,
	onSwitchToSignUp,
}: SignInFormProps) {
	const [error, setError] = useState<AuthErrorLike | null>(initialError);

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onSubmit: signInSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const result = await onSignIn({
				email: value.email.trim(),
				password: value.password,
			});
			if (result.error) {
				setError(result.error);
			}
		},
	});

	return (
		<div className="flex flex-col gap-5">
			<h1 className="font-bold text-xl">Entrar</h1>

			{error && (
				<p
					role="alert"
					className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
				>
					{authErrorMessage(error)}
				</p>
			)}

			{googleEnabled && (
				<>
					<SocialSignIn>
						<GoogleSignInButton onClick={onGoogleSignIn} />
					</SocialSignIn>
					{/* Google creates the account of who has none yet. */}
					<LegalConsent
						action="continuar com o Google"
						className="-mt-2 text-center text-muted-foreground"
					/>
					<AuthDivider />
				</>
			)}

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{(field) => (
						<AuthField
							field={field}
							label="E-mail"
							type="email"
							autoComplete="email"
						/>
					)}
				</form.Field>
				<form.Field name="password">
					{(field) => (
						<AuthField
							field={field}
							label="Senha"
							type="password"
							autoComplete="current-password"
						/>
					)}
				</form.Field>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" size="lg" disabled={isSubmitting}>
							Entrar
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-sm">
				Ainda não tem conta?{" "}
				<Button
					variant="link"
					className="h-auto p-0"
					onClick={onSwitchToSignUp}
				>
					Criar conta
				</Button>
			</p>
		</div>
	);
}
