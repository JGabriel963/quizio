import {
	DEFAULT_QUIZ_VISIBILITY,
	QUIZ_DESCRIPTION_MAX_LENGTH,
	QUIZ_TITLE_MAX_LENGTH,
	QUIZ_VISIBILITIES,
	type QuizVisibility,
} from "@quizio/core/quiz/domain/quiz-details";
import { characterCount } from "@quizio/core/shared/domain/text-length";
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
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import { Textarea } from "@quizio/ui/components/textarea";
import { useId, useState } from "react";

import {
	CoverImageField,
	type CoverImageFieldProps,
} from "./cover-image-field";
import { VISIBILITY_LABELS } from "./visibility-badge";

export type CoverChange =
	| { type: "keep" }
	| { type: "remove" }
	| { type: "set"; key: string };

export interface QuizDetailsSubmitValues {
	title: string | null;
	description: string | null;
	visibility: QuizVisibility;
	cover: CoverChange;
}

export interface QuizDetailsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	initialValues?: {
		title: string | null;
		description: string | null;
		visibility: QuizVisibility;
		coverImageUrl: string | null;
	};
	onSubmit: (
		values: QuizDetailsSubmitValues,
	) => Promise<{ error?: { message: string } | null }>;
	uploadCover: CoverImageFieldProps["upload"];
}

export function QuizDetailsDialog({
	open,
	onOpenChange,
	...formProps
}: QuizDetailsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
			<DialogContent>
				{/* Mounted only while open, so every opening starts from fresh values. */}
				{open && (
					<QuizDetailsForm {...formProps} onClose={() => onOpenChange(false)} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function QuizDetailsForm({
	mode,
	initialValues,
	onSubmit,
	uploadCover,
	onClose,
}: Omit<QuizDetailsDialogProps, "open" | "onOpenChange"> & {
	onClose: () => void;
}) {
	const ids = { title: useId(), description: useId(), visibility: useId() };
	const [title, setTitle] = useState(initialValues?.title ?? "");
	const [description, setDescription] = useState(
		initialValues?.description ?? "",
	);
	const [visibility, setVisibility] = useState<QuizVisibility>(
		initialValues?.visibility ?? DEFAULT_QUIZ_VISIBILITY,
	);
	const [cover, setCover] = useState<{
		change: CoverChange;
		url: string | null;
	}>({ change: { type: "keep" }, url: initialValues?.coverImageUrl ?? null });
	const [showLimitErrors, setShowLimitErrors] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const titleLength = characterCount(title.trim());
	const descriptionLength = characterCount(description.trim());
	const titleTooLong = titleLength > QUIZ_TITLE_MAX_LENGTH;
	const descriptionTooLong = descriptionLength > QUIZ_DESCRIPTION_MAX_LENGTH;

	const submit = async () => {
		setShowLimitErrors(true);
		setSubmitError(null);
		if (titleTooLong || descriptionTooLong) {
			return;
		}
		setSubmitting(true);
		const result = await onSubmit({
			title: title.trim() || null,
			description: description.trim() || null,
			visibility,
			cover: cover.change,
		});
		setSubmitting(false);
		if (result.error) {
			setSubmitError(result.error.message);
			return;
		}
		onClose();
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
			<DialogHeader>
				<DialogTitle>
					{mode === "create" ? "Criar quiz" : "Editar dados do quiz"}
				</DialogTitle>
				<DialogDescription>
					Título, descrição, capa e visibilidade. As perguntas chegam no editor.
				</DialogDescription>
			</DialogHeader>

			{submitError && (
				<p
					role="alert"
					className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
				>
					{submitError}
				</p>
			)}

			<div className="flex flex-col gap-1.5">
				<div className="flex items-baseline justify-between">
					<Label htmlFor={ids.title}>Título</Label>
					<CharacterCounter length={titleLength} max={QUIZ_TITLE_MAX_LENGTH} />
				</div>
				<Input
					id={ids.title}
					value={title}
					placeholder="Quiz sem título"
					aria-invalid={(showLimitErrors && titleTooLong) || undefined}
					onChange={(event) => setTitle(event.target.value)}
				/>
				{showLimitErrors && titleTooLong && (
					<p className="text-destructive text-sm">
						O título deve ter no máximo {QUIZ_TITLE_MAX_LENGTH} caracteres.
					</p>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-baseline justify-between">
					<Label htmlFor={ids.description}>Descrição</Label>
					<CharacterCounter
						length={descriptionLength}
						max={QUIZ_DESCRIPTION_MAX_LENGTH}
					/>
				</div>
				<Textarea
					id={ids.description}
					value={description}
					aria-invalid={(showLimitErrors && descriptionTooLong) || undefined}
					onChange={(event) => setDescription(event.target.value)}
				/>
				{showLimitErrors && descriptionTooLong && (
					<p className="text-destructive text-sm">
						A descrição deve ter no máximo {QUIZ_DESCRIPTION_MAX_LENGTH}{" "}
						caracteres.
					</p>
				)}
			</div>

			<CoverImageField
				imageUrl={cover.url}
				upload={uploadCover}
				onChange={(selection) =>
					setCover(
						selection.type === "set"
							? {
									change: { type: "set", key: selection.key },
									url: selection.url,
								}
							: { change: { type: "remove" }, url: null },
					)
				}
			/>

			<div className="flex flex-col gap-2">
				<span id={ids.visibility} className="font-medium text-sm">
					Visibilidade
				</span>
				<RadioGroup
					aria-labelledby={ids.visibility}
					value={visibility}
					onValueChange={(value) => setVisibility(value as QuizVisibility)}
					className="flex flex-wrap gap-4"
				>
					{QUIZ_VISIBILITIES.map((option) => (
						<Label key={option} className="flex items-center gap-2 font-normal">
							<RadioGroupItem
								value={option}
								aria-labelledby={`${ids.visibility}-${option}`}
							/>
							<span id={`${ids.visibility}-${option}`}>
								{VISIBILITY_LABELS[option]}
							</span>
						</Label>
					))}
				</RadioGroup>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit" disabled={submitting}>
					{mode === "create" ? "Criar quiz" : "Salvar"}
				</Button>
			</DialogFooter>
		</form>
	);
}

function CharacterCounter({ length, max }: { length: number; max: number }) {
	return (
		<span
			className={
				length > max
					? "text-destructive text-xs"
					: "text-muted-foreground text-xs"
			}
		>
			{length}/{max}
		</span>
	);
}
