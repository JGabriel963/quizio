import {
	CREATOR_NAME_LENGTH,
	normalizeCreatorName,
} from "@quizio/core/identity/domain/sign-up-rules";
import { characterCount } from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { Link } from "@tanstack/react-router";
import { ImageIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";

import { UserAvatar } from "@/components/account/user-avatar";

interface ProfileAccount {
	userId: string;
	name: string;
	email: string;
	photoUrl: string | null;
}

const NAME_LENGTH_MESSAGE = `O nome precisa ter de ${CREATOR_NAME_LENGTH.min} a ${CREATOR_NAME_LENGTH.max} caracteres.`;

/**
 * Seu perfil (spec 039, RN-07, RN-12 to RN-16): the photo, the name with
 * Alterar and the email, read only.
 */
export function ProfileSection({
	account,
	onRename,
	onOpenPhoto,
}: {
	account: ProfileAccount;
	onRename: (name: string) => Promise<void>;
	onOpenPhoto: () => void;
}) {
	const nameId = useId();
	const errorId = useId();
	const [name, setName] = useState(account.name);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	// A name saved elsewhere (another tab, the menu) shows here too.
	useEffect(() => {
		setName(account.name);
	}, [account.name]);

	const normalized = normalizeCreatorName(name);
	const changed = normalized !== account.name;

	async function save(event: FormEvent) {
		event.preventDefault();
		if (!changed || saving) {
			return;
		}
		const length = characterCount(normalized);
		if (length < CREATOR_NAME_LENGTH.min || length > CREATOR_NAME_LENGTH.max) {
			setError(NAME_LENGTH_MESSAGE);
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await onRename(normalized);
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="flex flex-col gap-5 rounded-lg bg-card p-6 shadow-sm">
			<div className="flex justify-center">
				{account.photoUrl ? (
					<button
						type="button"
						onClick={onOpenPhoto}
						aria-label="Alterar foto"
						className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
					>
						<UserAvatar
							userId={account.userId}
							photoUrl={account.photoUrl}
							size="xl"
							shape="square"
							className="size-32 ring-0"
						/>
					</button>
				) : (
					<button
						type="button"
						onClick={onOpenPhoto}
						className="flex size-32 flex-col items-center justify-center gap-2 rounded-lg border border-border border-dashed bg-muted text-sm hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring"
					>
						<ImageIcon aria-hidden="true" className="size-6" />
						Adicionar foto
					</button>
				)}
			</div>

			<form onSubmit={save} className="flex flex-col gap-1.5">
				<Label htmlFor={nameId}>Nome</Label>
				<div className="flex gap-2">
					<Input
						id={nameId}
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setError(null);
						}}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? errorId : undefined}
						className="flex-1"
					/>
					<Button type="submit" disabled={!changed || saving}>
						Alterar
					</Button>
				</div>
				{error && (
					<p id={errorId} className="text-destructive text-sm">
						{error}
					</p>
				)}
			</form>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${nameId}-email`}>E-mail</Label>
				<Input
					id={`${nameId}-email`}
					value={account.email}
					readOnly
					className="bg-muted"
				/>
			</div>

			<Button
				variant="secondary"
				render={
					<Link to="/profile/$userId" params={{ userId: account.userId }} />
				}
				nativeButton={false}
			>
				Ver perfil
			</Button>
		</section>
	);
}
