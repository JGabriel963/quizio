import {
	MAX_MEDIA_BYTES,
	MEDIA_EXTENSIONS,
} from "@quizio/core/media/domain/media-policy";
import { Button, buttonVariants } from "@quizio/ui/components/button";
import { useId, useState } from "react";

import { QuizCover } from "./quiz-cover";

export type CoverSelection =
	| { type: "set"; key: string; url: string }
	| { type: "remove" };

export interface CoverImageFieldProps {
	/** Cover currently shown: the saved one, or the one just uploaded. */
	imageUrl: string | null;
	onChange: (selection: CoverSelection) => void;
	upload: (
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<{ key: string; url: string }>;
}

const ACCEPTED_TYPES = Object.keys(MEDIA_EXTENSIONS);

/** Uploads the cover straight to storage; the quiz is only saved with the form. */
export function CoverImageField({
	imageUrl,
	onChange,
	upload,
}: CoverImageFieldProps) {
	const inputId = useId();
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleFile = async (file: File) => {
		setError(null);
		// Same media policy as the server (spec 001, RN-15), checked early to avoid a wasted upload.
		if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_MEDIA_BYTES) {
			setError("Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.");
			return;
		}
		setProgress(0);
		try {
			const uploaded = await upload(file, setProgress);
			onChange({ type: "set", ...uploaded });
		} catch {
			setError(
				"Não foi possível enviar a imagem. A capa anterior foi mantida.",
			);
		} finally {
			setProgress(null);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium text-sm">Capa</span>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt="Capa do quiz"
						className="aspect-video w-full rounded-md bg-muted object-cover sm:w-44"
					/>
				) : (
					<QuizCover url={null} className="w-full sm:w-44" />
				)}
				<div className="flex flex-wrap gap-2 sm:flex-col">
					<label
						htmlFor={inputId}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						{imageUrl ? "Trocar imagem" : "Enviar imagem"}
					</label>
					<input
						id={inputId}
						type="file"
						aria-label="Enviar capa"
						accept={ACCEPTED_TYPES.join(",")}
						className="sr-only"
						disabled={progress !== null}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file) {
								void handleFile(file);
							}
						}}
					/>
					{imageUrl && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={progress !== null}
							onClick={() => onChange({ type: "remove" })}
						>
							Remover capa
						</Button>
					)}
				</div>
			</div>
			{progress !== null && (
				<progress
					value={progress}
					max={1}
					aria-label="Enviando capa"
					className="h-2 w-full overflow-hidden rounded-full accent-primary"
				/>
			)}
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	);
}
