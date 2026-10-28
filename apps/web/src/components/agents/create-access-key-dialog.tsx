import { ACCESS_KEY_NAME_MAX_LENGTH } from "@quizio/core/agents/domain/access-key";
import { Button } from "@quizio/ui/components/button";
import { CodeBlock } from "@quizio/ui/components/code-block";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { useState } from "react";

import { CountedField } from "@/components/groups/counted-field";
import { agentErrorMessage } from "@/lib/agent-labels";
import type { AccessKeyData } from "@/lib/api-types";

export interface CreatedAccessKey {
	key: AccessKeyData;
	/** The whole secret, shown here once (RN-05). */
	secret: string;
}

/**
 * Criar chave (spec 044, RN-05): the name first, then the key, shown only
 * here, with Copiar and the warning that it will not be shown again.
 */
export function CreateAccessKeyDialog({
	open,
	onClose,
	onCreate,
}: {
	open: boolean;
	onClose: () => void;
	onCreate: (name: string) => Promise<CreatedAccessKey>;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<DialogContent>
				{/* Mounted only while open: the secret never outlives the dialog. */}
				{open && <CreateAccessKeyForm onClose={onClose} onCreate={onCreate} />}
			</DialogContent>
		</Dialog>
	);
}

function CreateAccessKeyForm({
	onClose,
	onCreate,
}: {
	onClose: () => void;
	onCreate: (name: string) => Promise<CreatedAccessKey>;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [secret, setSecret] = useState<string | null>(null);
	const blank = name.trim() === "";

	if (secret) {
		return (
			<div className="grid gap-5">
				<DialogHeader>
					<DialogTitle>Sua chave de acesso</DialogTitle>
				</DialogHeader>
				<CodeBlock code={secret} label="Sua chave de acesso" />
				<p className="font-semibold text-sm">
					Copie agora: esta chave não será mostrada de novo.
				</p>
				<DialogFooter>
					<Button type="button" variant="success" onClick={onClose}>
						Concluído
					</Button>
				</DialogFooter>
			</div>
		);
	}

	async function submit() {
		if (blank) {
			return;
		}
		setSaving(true);
		try {
			setSecret((await onCreate(name.trim())).secret);
		} catch (failure) {
			setError(agentErrorMessage(failure));
		} finally {
			setSaving(false);
		}
	}

	return (
		<form
			className="grid gap-5"
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<DialogHeader>
				<DialogTitle>Criar chave</DialogTitle>
			</DialogHeader>
			<CountedField
				label="Nome"
				value={name}
				max={ACCESS_KEY_NAME_MAX_LENGTH}
				placeholder="Ex.: Script da escola"
				error={error}
				autoFocus
				onChange={(value) => {
					setName(value);
					setError(null);
				}}
			/>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit" variant="success" disabled={blank || saving}>
					Criar chave
				</Button>
			</DialogFooter>
		</form>
	);
}
