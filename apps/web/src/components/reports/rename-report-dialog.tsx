import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { useId, useState } from "react";

import { RENAME_FAILED_MESSAGE, reportNameProblem } from "@/lib/report-name";

/**
 * Renames a report from the list's menu (spec 015, RN-45 to RN-47). `onRename`
 * rejects when the server did not take the name; the dialog then stays open,
 * with the reason.
 */
export function RenameReportDialog({
	report,
	onClose,
	onRename,
}: {
	/** The report to rename; null keeps the dialog closed. */
	report: { name: string } | null;
	onClose: () => void;
	onRename: (name: string) => Promise<unknown>;
}) {
	return (
		<Dialog
			open={report !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent>
				{/* Mounted only while open, so every opening starts from the name. */}
				{report && (
					<RenameForm
						currentName={report.name}
						onClose={onClose}
						onRename={onRename}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function RenameForm({
	currentName,
	onClose,
	onRename,
}: {
	currentName: string;
	onClose: () => void;
	onRename: (name: string) => Promise<unknown>;
}) {
	const fieldId = useId();
	const errorId = useId();
	const [name, setName] = useState(currentName);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function submit() {
		const problem = reportNameProblem(name);
		if (problem) {
			setError(problem);
			return;
		}
		if (name.trim() === currentName) {
			onClose();
			return;
		}
		setSaving(true);
		try {
			await onRename(name.trim());
			onClose();
		} catch {
			setError(RENAME_FAILED_MESSAGE);
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
				<DialogTitle>Renomear relatório</DialogTitle>
				<DialogDescription>
					O nome vale só para este relatório: o quiz continua com o título dele.
				</DialogDescription>
			</DialogHeader>
			<div className="grid gap-2">
				<Label htmlFor={fieldId}>Nome do relatório</Label>
				<Input
					id={fieldId}
					value={name}
					autoFocus
					aria-invalid={error !== null || undefined}
					aria-describedby={error ? errorId : undefined}
					onChange={(event) => {
						setName(event.target.value);
						setError(null);
					}}
				/>
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
				<Button type="submit" disabled={saving}>
					Renomear
				</Button>
			</DialogFooter>
		</form>
	);
}
