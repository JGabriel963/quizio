import { IMAGE_ALT_TEXT_MAX_LENGTH } from "@quizio/core/quiz/domain/question-image";
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

/**
 * "Adicionar detalhes da mídia" (spec 007, RN-28 a RN-30): the optional alt
 * text of the image. `altText` is `undefined` while the dialog is closed.
 */
export function MediaDetailsDialog({
	altText,
	onSave,
	onClose,
}: {
	altText: string | null | undefined;
	onSave: (altText: string | null) => void;
	onClose: () => void;
}) {
	return (
		<Dialog
			open={altText !== undefined}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-xl">
				{/* Mounted only while open, so every opening starts from the saved text. */}
				{altText !== undefined && (
					<DetailsForm initial={altText} onSave={onSave} onClose={onClose} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function DetailsForm({
	initial,
	onSave,
	onClose,
}: {
	initial: string | null;
	onSave: (altText: string | null) => void;
	onClose: () => void;
}) {
	const ids = { field: useId(), help: useId() };
	const [text, setText] = useState(initial ?? "");

	return (
		<form
			noValidate
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				onSave(text.trim() || null);
			}}
		>
			<DialogHeader className="pr-0">
				<DialogTitle className="text-2xl">
					Adicionar detalhes da mídia
				</DialogTitle>
			</DialogHeader>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor={ids.field} className="font-bold">
					Adicionar um texto alternativo
				</Label>
				<p id={ids.help} className="text-sm">
					Descreva a mídia em 1 ou 2 frases. Isso ajuda pessoas com deficiências
					visuais e auditivas a entenderem a mídia.
				</p>
				<div className="relative">
					<Input
						id={ids.field}
						autoFocus
						value={text}
						aria-describedby={ids.help}
						onChange={(event) =>
							setText(
								truncateCharacters(
									event.target.value,
									IMAGE_ALT_TEXT_MAX_LENGTH,
								),
							)
						}
						className="pr-14"
					/>
					<span
						role="status"
						aria-label="Caracteres restantes no texto alternativo"
						className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm"
					>
						{IMAGE_ALT_TEXT_MAX_LENGTH - characterCount(text)}
					</span>
				</div>
			</div>

			<DialogFooter className="sm:justify-center">
				<Button type="button" variant="secondary" onClick={onClose}>
					Fechar
				</Button>
				<Button type="submit">Adicionar</Button>
			</DialogFooter>
		</form>
	);
}
