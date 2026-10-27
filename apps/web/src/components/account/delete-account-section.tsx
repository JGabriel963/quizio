import {
	ACCOUNT_DELETION_REASONS,
	type AccountDeletionConfirmation,
	type AccountDeletionReason,
	DELETION_FEEDBACK_MAX_LENGTH,
} from "@quizio/core/identity/domain/account-deletion";
import { normalizeEmail } from "@quizio/core/identity/domain/sign-up-rules";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { Textarea } from "@quizio/ui/components/textarea";
import { type FormEvent, useId, useState } from "react";

import { UserAvatar } from "@/components/account/user-avatar";

/** "Motivo para excluir a conta" (spec 039, RN-37), in the core's order. */
const REASON_LABELS: Record<AccountDeletionReason, string> = {
	otherAccount: "Tenho outra conta",
	newProfile: "Quero criar um novo perfil",
	thoughtNeededAccountToPlay: "Pensei que precisava de uma conta para jogar",
	missingFeatures: "Falta de recursos",
	technicalProblems: "Problemas técnicos",
	notUsing: "Eu não uso esta conta",
	notWhatExpected: "O Quizio não era o que eu pensei que fosse",
	other: "Outro",
};

export interface DeleteAccountRequest {
	reason: AccountDeletionReason;
	feedback: string | null;
	confirmation: AccountDeletionConfirmation;
}

/** The server's refusal, in Portuguese (RN-38). */
function deletionErrorMessage(error: unknown): string {
	const code = (error as { data?: { domainCode?: string | null } } | null)?.data
		?.domainCode;
	switch (code) {
		case "IDENTITY.WRONG_PASSWORD":
			return "A senha está incorreta.";
		case "IDENTITY.TOO_MANY_ATTEMPTS":
			return "Muitas tentativas. Tente de novo em instantes.";
		case "IDENTITY.EMAIL_MISMATCH":
			return "O e-mail não é o desta conta.";
		default:
			return "Não foi possível excluir a conta. Tente novamente.";
	}
}

/**
 * Exclusão de conta (spec 039, RN-35 to RN-38): the warning, then the form
 * with the reason and the feedback, then a last confirmation with the
 * password, or the email for an account that only signs in with Google.
 */
export function DeleteAccountSection({
	account,
	onDelete,
}: {
	account: {
		userId: string;
		name: string;
		email: string;
		photoUrl: string | null;
		hasPassword: boolean;
	};
	onDelete: (request: DeleteAccountRequest) => Promise<void>;
}) {
	const reasonId = useId();
	const feedbackId = useId();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState<AccountDeletionReason | "">("");
	const [feedback, setFeedback] = useState("");
	const [confirming, setConfirming] = useState(false);

	if (!open) {
		return (
			<section className="flex flex-col gap-1 rounded-lg bg-card p-6 shadow-sm">
				<Button
					variant="link"
					className="self-start px-0 font-bold"
					onClick={() => setOpen(true)}
				>
					Excluir conta
				</Button>
				<p className="text-sm">
					Ao excluir sua conta, você perderá o acesso a todos os quizzes que
					criou.
				</p>
			</section>
		);
	}

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (reason) {
			setConfirming(true);
		}
	};

	return (
		<section className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-sm">
			<div className="flex items-center gap-3">
				<UserAvatar
					userId={account.userId}
					photoUrl={account.photoUrl}
					size="lg"
				/>
				<span className="font-bold">{account.name}</span>
			</div>
			<p className="text-sm">
				Lamentamos que você tenha partido. Agradecemos se puder dizer por que
				decidiu excluir sua conta. Assim, podemos melhorar o Quizio.
			</p>
			<form onSubmit={submit} className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={reasonId}>Motivo para excluir a conta</Label>
					<select
						id={reasonId}
						value={reason}
						onChange={(event) =>
							setReason(event.target.value as AccountDeletionReason | "")
						}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="" disabled>
							Escolha uma opção
						</option>
						{ACCOUNT_DELETION_REASONS.map((item) => (
							<option key={item} value={item}>
								{REASON_LABELS[item]}
							</option>
						))}
					</select>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={feedbackId}>
						Gostaria de compartilhar algum feedback? (opcional)
					</Label>
					<Textarea
						id={feedbackId}
						value={feedback}
						maxLength={DELETION_FEEDBACK_MAX_LENGTH}
						placeholder="Adicione seu feedback aqui"
						onChange={(event) =>
							setFeedback(
								event.target.value.slice(0, DELETION_FEEDBACK_MAX_LENGTH),
							)
						}
						rows={4}
					/>
				</div>
				<p className="text-sm">
					<strong>Observação</strong>: todos os quizzes, relatórios e grupos que
					você administra serão excluídos, e as suas publicações saem dos
					grupos.
				</p>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						onClick={() => {
							setOpen(false);
							setReason("");
							setFeedback("");
						}}
					>
						Cancelar
					</Button>
					<Button type="submit" variant="destructive" disabled={!reason}>
						Excluir conta
					</Button>
				</div>
			</form>
			{reason && (
				<ConfirmDeletionDialog
					open={confirming}
					account={account}
					onCancel={() => setConfirming(false)}
					onConfirm={(confirmation) =>
						onDelete({
							reason,
							feedback: feedback.trim() === "" ? null : feedback,
							confirmation,
						})
					}
				/>
			)}
		</section>
	);
}

function ConfirmDeletionDialog({
	open,
	account,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	account: { email: string; hasPassword: boolean };
	onCancel: () => void;
	onConfirm: (confirmation: AccountDeletionConfirmation) => Promise<void>;
}) {
	const fieldId = useId();
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const ready = account.hasPassword
		? value.length > 0
		: normalizeEmail(value) === normalizeEmail(account.email);

	async function confirm(event: FormEvent) {
		event.preventDefault();
		if (!ready || deleting) {
			return;
		}
		setDeleting(true);
		setError(null);
		try {
			await onConfirm(
				account.hasPassword
					? { kind: "password", password: value }
					: { kind: "email", email: value },
			);
		} catch (failure) {
			setError(deletionErrorMessage(failure));
		} finally {
			setDeleting(false);
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setValue("");
					setError(null);
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<form onSubmit={confirm} className="contents">
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
						<AlertDialogDescription>
							Tudo o que você criou será excluído. Esta ação não pode ser
							desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={fieldId}>
							{account.hasPassword
								? "Senha"
								: "Digite seu e-mail para confirmar"}
						</Label>
						<Input
							id={fieldId}
							type={account.hasPassword ? "password" : "email"}
							autoComplete={account.hasPassword ? "current-password" : "off"}
							value={value}
							onChange={(event) => setValue(event.target.value)}
						/>
						{error && (
							<p role="alert" className="text-destructive text-sm">
								{error}
							</p>
						)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
						<Button
							type="submit"
							variant="destructive"
							disabled={!ready || deleting}
						>
							Excluir minha conta
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
