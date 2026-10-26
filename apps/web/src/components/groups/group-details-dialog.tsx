import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	GROUP_NAME_MAX_LENGTH,
} from "@quizio/core/groups/domain/group";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { useState } from "react";

import { groupErrorMessage } from "@/lib/group-error-messages";

import { CountedField } from "./counted-field";

interface GroupDetails {
	name: string;
	description: string;
}

/**
 * "Nome e descrição" (spec 035, RN-04, RN-05). `onSave` rejects when the
 * server did not take them; the dialog then stays open, with the reason.
 */
export function GroupDetailsDialog({
	details,
	onClose,
	onSave,
}: {
	/** The saved values; null keeps the dialog closed. */
	details: GroupDetails | null;
	onClose: () => void;
	onSave: (details: GroupDetails) => Promise<unknown>;
}) {
	return (
		<Dialog
			open={details !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent>
				{/* Mounted only while open, so every opening starts from the saved values. */}
				{details && (
					<DetailsForm saved={details} onClose={onClose} onSave={onSave} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function DetailsForm({
	saved,
	onClose,
	onSave,
}: {
	saved: GroupDetails;
	onClose: () => void;
	onSave: (details: GroupDetails) => Promise<unknown>;
}) {
	const [name, setName] = useState(saved.name);
	const [description, setDescription] = useState(saved.description);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const blank = name.trim() === "";

	async function submit() {
		if (blank) {
			return;
		}
		setSaving(true);
		try {
			await onSave({ name: name.trim(), description: description.trim() });
			onClose();
		} catch (failure) {
			setError(groupErrorMessage(failure));
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
				<DialogTitle>Nome e descrição</DialogTitle>
			</DialogHeader>
			<CountedField
				label="Nome"
				value={name}
				max={GROUP_NAME_MAX_LENGTH}
				placeholder="Adicionar nome do grupo"
				autoFocus
				onChange={(value) => {
					setName(value);
					setError(null);
				}}
			/>
			<CountedField
				label="Descrição"
				value={description}
				max={GROUP_DESCRIPTION_MAX_LENGTH}
				placeholder="Fale um pouco sobre o seu grupo."
				multiline
				error={error}
				onChange={(value) => {
					setDescription(value);
					setError(null);
				}}
			/>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit" variant="success" disabled={blank || saving}>
					Salvar
				</Button>
			</DialogFooter>
		</form>
	);
}
