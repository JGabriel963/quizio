import { GROUP_NAME_MAX_LENGTH } from "@quizio/core/groups/domain/group";
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

/**
 * "Criar grupo" (spec 034, RN-11). `onCreate` rejects when the server did
 * not take the name; the dialog then stays open, with the reason.
 */
export function CreateGroupDialog({
	open,
	onClose,
	onCreate,
}: {
	open: boolean;
	onClose: () => void;
	onCreate: (name: string) => Promise<unknown>;
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
				{/* Mounted only while open, so every opening starts empty. */}
				{open && <CreateGroupForm onClose={onClose} onCreate={onCreate} />}
			</DialogContent>
		</Dialog>
	);
}

function CreateGroupForm({
	onClose,
	onCreate,
}: {
	onClose: () => void;
	onCreate: (name: string) => Promise<unknown>;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const blank = name.trim() === "";

	async function submit() {
		if (blank) {
			return;
		}
		setSaving(true);
		try {
			await onCreate(name.trim());
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
				<DialogTitle>Criar grupo</DialogTitle>
			</DialogHeader>
			<CountedField
				label="Nome"
				value={name}
				max={GROUP_NAME_MAX_LENGTH}
				placeholder="Adicionar nome do grupo"
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
					Criar grupo
				</Button>
			</DialogFooter>
		</form>
	);
}
