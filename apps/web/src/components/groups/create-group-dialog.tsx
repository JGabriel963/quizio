import { GROUP_NAME_MAX_LENGTH } from "@quizio/core/groups/domain/group";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { useId, useState } from "react";

import { groupErrorMessage } from "@/lib/group-error-messages";

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
	const fieldId = useId();
	const counterId = useId();
	const errorId = useId();
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
			<div className="grid gap-2">
				<Label htmlFor={fieldId}>Nome</Label>
				<div className="relative">
					<Input
						id={fieldId}
						value={name}
						autoFocus
						placeholder="Adicionar nome do grupo"
						className="pr-12"
						aria-invalid={error !== null || undefined}
						aria-describedby={error ? `${counterId} ${errorId}` : counterId}
						onChange={(event) => {
							// Characters as the server counts them (RN-03).
							setName(
								truncateCharacters(event.target.value, GROUP_NAME_MAX_LENGTH),
							);
							setError(null);
						}}
					/>
					<span
						id={counterId}
						className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm"
					>
						<span className="sr-only">Caracteres restantes: </span>
						{GROUP_NAME_MAX_LENGTH - characterCount(name)}
					</span>
				</div>
				{error && (
					<p id={errorId} role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}
			</div>
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
