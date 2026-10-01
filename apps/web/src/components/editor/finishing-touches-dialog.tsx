import {
	QUIZ_DESCRIPTION_MAX_LENGTH,
	QUIZ_TITLE_MAX_LENGTH,
} from "@quizio/core/quiz/domain/quiz-details";
import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
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
import { Textarea } from "@quizio/ui/components/textarea";
import { useId, useState } from "react";

export interface FinishingTouches {
	title: string;
	description: string | null;
}

/**
 * "Toques finais": Salvar asks for the title a quiz needs to be played, and
 * offers the description on the way (spec 006, RN-12).
 */
export function FinishingTouchesDialog({
	open,
	initialDescription,
	onCancel,
	onSubmit,
}: {
	open: boolean;
	initialDescription: string | null;
	onCancel: () => void;
	/** Resolves an error message to show, or null when the quiz was saved. */
	onSubmit: (touches: FinishingTouches) => Promise<string | null>;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onCancel();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				{/* Mounted only while open, so every opening starts empty. */}
				{open && (
					<FinishingTouchesForm
						initialDescription={initialDescription}
						onCancel={onCancel}
						onSubmit={onSubmit}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function FinishingTouchesForm({
	initialDescription,
	onCancel,
	onSubmit,
}: {
	initialDescription: string | null;
	onCancel: () => void;
	onSubmit: (touches: FinishingTouches) => Promise<string | null>;
}) {
	const ids = {
		title: useId(),
		titleHelp: useId(),
		description: useId(),
		descriptionHelp: useId(),
	};
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState(initialDescription ?? "");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canContinue = title.trim() !== "" && !submitting;

	const submit = async () => {
		if (!canContinue) {
			return;
		}
		setSubmitting(true);
		setError(null);
		const failure = await onSubmit({
			title: title.trim(),
			description: description.trim() || null,
		});
		setSubmitting(false);
		setError(failure);
	};

	return (
		<form
			noValidate
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<DialogHeader className="pr-0">
				<DialogTitle className="text-2xl">Toques finais</DialogTitle>
				<DialogDescription className="text-base text-foreground">
					Um título e uma descrição ajudam você a encontrar seu quiz depois.
				</DialogDescription>
			</DialogHeader>

			{error && (
				<p
					role="alert"
					className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
				>
					{error}
				</p>
			)}

			<div className="flex flex-col gap-1.5">
				<Label htmlFor={ids.title} className="font-bold">
					Título
				</Label>
				<p id={ids.titleHelp} className="text-sm">
					Defina um título para o seu quiz.
				</p>
				<div className="relative">
					<Input
						id={ids.title}
						autoFocus
						value={title}
						aria-describedby={ids.titleHelp}
						onChange={(event) =>
							setTitle(
								truncateCharacters(event.target.value, QUIZ_TITLE_MAX_LENGTH),
							)
						}
						className="pr-12"
					/>
					<RemainingCharacters
						label="Caracteres restantes no título"
						remaining={QUIZ_TITLE_MAX_LENGTH - characterCount(title)}
						className="top-1/2 -translate-y-1/2"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor={ids.description} className="font-bold">
					Descrição{" "}
					<span className="font-normal text-muted-foreground">(Opcional)</span>
				</Label>
				<p id={ids.descriptionHelp} className="text-sm">
					Descreva brevemente o conteúdo.
				</p>
				<div className="relative">
					<Textarea
						id={ids.description}
						value={description}
						aria-describedby={ids.descriptionHelp}
						onChange={(event) =>
							setDescription(
								truncateCharacters(
									event.target.value,
									QUIZ_DESCRIPTION_MAX_LENGTH,
								),
							)
						}
						className="min-h-32 pr-14"
					/>
					<RemainingCharacters
						label="Caracteres restantes na descrição"
						remaining={
							QUIZ_DESCRIPTION_MAX_LENGTH - characterCount(description)
						}
						className="top-3"
					/>
				</div>
			</div>

			<DialogFooter className="sm:justify-center">
				<Button type="button" variant="secondary" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit" variant="success" disabled={!canContinue}>
					Continuar
				</Button>
			</DialogFooter>
		</form>
	);
}

/** How many characters still fit, inside the field, as in Kahoot. */
function RemainingCharacters({
	label,
	remaining,
	className,
}: {
	label: string;
	remaining: number;
	className: string;
}) {
	return (
		<span
			role="status"
			aria-label={label}
			className={`pointer-events-none absolute right-3 text-muted-foreground text-sm ${className}`}
		>
			{remaining}
		</span>
	);
}
