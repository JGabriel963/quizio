import { PASSWORD_LENGTH } from "@quizio/core/identity/domain/sign-up-rules";
import { Button } from "@quizio/ui/components/button";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/account/user-avatar";
import {
	type AuthErrorLike,
	authErrorMessage,
} from "@/lib/auth-error-messages";

const LENGTH_MESSAGE = `A nova senha precisa ter de ${PASSWORD_LENGTH.min} a ${PASSWORD_LENGTH.max} caracteres.`;

/** What changing the password answered, as Better Auth's client does. */
export type ChangePassword = (input: {
	currentPassword: string;
	newPassword: string;
}) => Promise<{ error: AuthErrorLike | null }>;

function changeErrorMessage(error: AuthErrorLike): string {
	if (error.status === 429) {
		return "Muitas tentativas. Tente de novo em instantes.";
	}
	if (error.code === "INVALID_PASSWORD") {
		return "A senha atual está incorreta.";
	}
	return authErrorMessage(error);
}

/**
 * Senha (spec 039, RN-20 to RN-24): the account's photo and email, then
 * Alterar senha. An account that only signs in with Google has no password.
 */
export function PasswordSection({
	account,
	onChange,
}: {
	account: {
		userId: string;
		email: string;
		photoUrl: string | null;
		hasPassword: boolean;
	};
	onChange: ChangePassword;
}) {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [repeat, setRepeat] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (
			next.length < PASSWORD_LENGTH.min ||
			next.length > PASSWORD_LENGTH.max
		) {
			setError(LENGTH_MESSAGE);
			return;
		}
		if (next !== repeat) {
			setError("As senhas não coincidem.");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const result = await onChange({
				currentPassword: current,
				newPassword: next,
			});
			if (result.error) {
				setError(changeErrorMessage(result.error));
				return;
			}
			setCurrent("");
			setNext("");
			setRepeat("");
			toast.success("Senha alterada");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="flex flex-col gap-5 rounded-lg bg-card p-6 shadow-sm">
			<div className="flex items-center gap-3 border-border border-b pb-4">
				<UserAvatar userId={account.userId} photoUrl={account.photoUrl} />
				<span className="truncate">{account.email}</span>
			</div>
			{account.hasPassword ? (
				<form onSubmit={submit} className="flex flex-col gap-4">
					<PasswordField
						label="Senha atual"
						showLabel="Mostrar a senha atual"
						placeholder="Insira a senha atual"
						value={current}
						onChange={setCurrent}
					/>
					<PasswordField
						label="Nova senha"
						showLabel="Mostrar a nova senha"
						placeholder="Insira uma nova senha"
						value={next}
						onChange={setNext}
					/>
					<PasswordField
						label="Repita a nova senha"
						showLabel="Mostrar a nova senha repetida"
						placeholder="Insira a nova senha novamente"
						value={repeat}
						onChange={setRepeat}
					/>
					{error && (
						<p role="alert" className="text-destructive text-sm">
							{error}
						</p>
					)}
					<p className="text-muted-foreground text-sm">
						Alterar a senha também desconecta seus agentes de IA.
					</p>
					<Button
						type="submit"
						className="self-start"
						disabled={!current || !next || !repeat || saving}
					>
						Alterar senha
					</Button>
				</form>
			) : (
				<p>Você entra com o Google. Esta conta não tem senha.</p>
			)}
		</section>
	);
}

function PasswordField({
	label,
	showLabel,
	placeholder,
	value,
	onChange,
}: {
	label: string;
	showLabel: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	const [visible, setVisible] = useState(false);
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<div className="relative">
				<Input
					id={id}
					type={visible ? "text" : "password"}
					value={value}
					placeholder={placeholder}
					autoComplete={
						label === "Senha atual" ? "current-password" : "new-password"
					}
					onChange={(event) => onChange(event.target.value)}
					className="pr-10"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={showLabel}
					aria-pressed={visible}
					onClick={() => setVisible((shown) => !shown)}
					className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
				>
					{visible ? <EyeOffIcon /> : <EyeIcon />}
				</Button>
			</div>
		</div>
	);
}
