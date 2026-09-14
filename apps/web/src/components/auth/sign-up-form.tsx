import {
	CREATOR_NAME_LENGTH,
	normalizeCreatorName,
	PASSWORD_LENGTH,
} from "@quizio/core/identity/domain/sign-up-rules";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import {
	type AuthErrorLike,
	authErrorMessage,
} from "@/lib/auth-error-messages";

import { AuthField } from "./auth-field";
import { AuthDivider, GoogleSignInButton } from "./google-sign-in-button";
import type { AuthActionResult } from "./sign-in-form";

export interface SignUpFormProps {
	signUpEnabled: boolean;
	googleEnabled: boolean;
	onSignUp: (values: {
		name: string;
		email: string;
		password: string;
	}) => Promise<AuthActionResult>;
	onGoogleSignIn: () => void;
	onSwitchToSignIn: () => void;
}

// Same limits and messages as the server (core sign-up rules + Better Auth codes).
const signUpSchema = z.object({
	name: z.string().refine(
		(name) => {
			const length = characterCount(normalizeCreatorName(name));
			return (
				length >= CREATOR_NAME_LENGTH.min && length <= CREATOR_NAME_LENGTH.max
			);
		},
		authErrorMessage({ code: "INVALID_NAME" }),
	),
	email: z
		.string()
		.trim()
		.pipe(z.email(authErrorMessage({ code: "INVALID_EMAIL" }))),
	password: z
		.string()
		.min(PASSWORD_LENGTH.min, authErrorMessage({ code: "PASSWORD_TOO_SHORT" }))
		.max(PASSWORD_LENGTH.max, authErrorMessage({ code: "PASSWORD_TOO_LONG" })),
});

export function SignUpForm({
	signUpEnabled,
	googleEnabled,
	onSignUp,
	onGoogleSignIn,
	onSwitchToSignIn,
}: SignUpFormProps) {
	const [error, setError] = useState<AuthErrorLike | null>(null);

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		validators: { onSubmit: signUpSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			const result = await onSignUp({
				name: normalizeCreatorName(value.name),
				email: value.email.trim(),
				password: value.password,
			});
			if (result.error) {
				setError(result.error);
			}
		},
	});

	const switchToSignIn = (
		<p className="text-center text-muted-foreground text-sm">
			Já tem conta?{" "}
			<Button variant="link" className="h-auto p-0" onClick={onSwitchToSignIn}>
				Entrar
			</Button>
		</p>
	);

	if (!signUpEnabled) {
		return (
			<div className="flex flex-col gap-6 text-center">
				<h1 className="font-bold text-2xl">Criar conta</h1>
				<p className="rounded-md bg-muted px-3 py-3 text-sm">
					{authErrorMessage({ code: "SIGNUP_DISABLED" })}
				</p>
				{switchToSignIn}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1 text-center">
				<h1 className="font-bold text-2xl">Criar conta</h1>
				<p className="text-muted-foreground text-sm">
					Crie e organize seus quizzes.
				</p>
			</div>

			{error && (
				<p
					role="alert"
					className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
				>
					{authErrorMessage(error)}
				</p>
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
				<form.Field name="name">
					{(field) => (
						<AuthField field={field} label="Nome" autoComplete="name" />
					)}
				</form.Field>
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
							autoComplete="new-password"
						/>
					)}
				</form.Field>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" size="lg" disabled={isSubmitting}>
							Criar conta
						</Button>
					)}
				</form.Subscribe>
			</form>

			{googleEnabled && (
				<>
					<AuthDivider />
					<GoogleSignInButton onClick={onGoogleSignIn} />
				</>
			)}

			{switchToSignIn}
		</div>
	);
}
