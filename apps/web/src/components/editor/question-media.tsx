import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import type { QuestionImage } from "@quizio/core/quiz/domain/question-image";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CropIcon, InfoIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";

import {
	dismissBackgroundNotice,
	isBackgroundNoticeDismissed,
} from "@/lib/background-notice";
import {
	ACCEPTED_IMAGE_TYPES,
	IMAGE_REJECTED_MESSAGE,
	pickImageFile,
} from "@/lib/question-image-upload";

import { BackgroundNoticeDialog } from "./background-notice-dialog";
import { CropImageDialog } from "./crop-image-dialog";
import { MediaDetailsDialog } from "./media-details-dialog";
import { QuestionImageView } from "./question-image-view";
import { UploadImageDialog } from "./upload-image-dialog";

/** The upload of a question's image, kept by the editor so it survives a change of question. */
export interface ImageUploadState {
	/** Fraction sent so far, or null when nothing is being sent. */
	progress: number | null;
	/** Why the last upload failed, if it did. */
	error: string | null;
}

export const NO_UPLOAD: ImageUploadState = { progress: null, error: null };

/**
 * The media area of a question (spec 007): empty with the ways to send an
 * image, sending, or the image with its actions. As a background the image is
 * drawn by the editor behind everything, and the area keeps only the actions.
 */
export function QuestionMedia({
	image,
	url,
	upload,
	onUpload,
	onChange,
}: {
	image: QuestionImage | null;
	/** Public URL of `image`; null while the editor does not know it. */
	url: string | null;
	upload: ImageUploadState;
	onUpload: (file: File) => void;
	onChange: (change: QuestionChange) => void;
}) {
	const inputId = useId();
	const [dialog, setDialog] = useState<
		"upload" | "crop" | "details" | "notice" | null
	>(null);
	const [rejected, setRejected] = useState(false);
	const [over, setOver] = useState(false);
	const uploading = upload.progress !== null;

	// The upload dialog closes by itself once the image is in (RN-08).
	if (image && dialog === "upload") {
		setDialog(null);
	}
	const close = () => setDialog(null);

	const send = (files: Iterable<File>) => {
		if (uploading) {
			return;
		}
		const file = pickImageFile(files);
		setRejected(file === null);
		if (file) {
			onUpload(file);
		}
	};

	if (image) {
		const background = image.placement === "background";
		// A file dropped here is swallowed, or the browser would open it in the tab:
		// replacing the image is removing it and inserting another (RN-17).
		return (
			<section
				aria-label="Mídia"
				data-placement={image.placement}
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => event.preventDefault()}
				className={cn(
					"relative shrink-0 overflow-hidden rounded-md",
					// As a background there is no box: the actions sit at the end of the
					// free space, in line with the answers below, as in Kahoot.
					background
						? "size-full"
						: "aspect-[3/2] w-[min(100cqw,150cqh)] bg-card/70",
				)}
			>
				{!background && url && <QuestionImageView image={image} url={url} />}
				<div className="absolute right-2 bottom-2 left-2 flex flex-wrap justify-end gap-1.5 sm:right-3 sm:bottom-3">
					<Button
						variant="outline"
						size="sm"
						className="shadow-sm"
						onClick={() => {
							onChange({
								kind: "imagePlacement",
								placement: background ? "media" : "background",
							});
							if (!background && !isBackgroundNoticeDismissed()) {
								setDialog("notice");
							}
						}}
					>
						{background ? "Usar como mídia" : "Usar como fundo"}
					</Button>
					{/* The background always fills the screen: there is nothing to crop (RN-24). */}
					{!background && (
						<Button
							variant="outline"
							size="icon-sm"
							className="shadow-sm"
							aria-label="Editar recorte de imagem"
							title="Editar recorte de imagem"
							onClick={() => setDialog("crop")}
						>
							<CropIcon />
						</Button>
					)}
					<Button
						variant="outline"
						size="icon-sm"
						className="shadow-sm"
						aria-label="Detalhes da mídia"
						title="Detalhes da mídia"
						onClick={() => setDialog("details")}
					>
						<InfoIcon />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						className="shadow-sm"
						aria-label="Remover imagem"
						title="Remover"
						onClick={() => onChange({ kind: "image", key: null })}
					>
						<Trash2Icon />
					</Button>
				</div>

				<CropImageDialog
					url={dialog === "crop" ? url : null}
					onClose={close}
					onSave={(crop) => {
						onChange({ kind: "imageCrop", crop });
						close();
					}}
				/>
				<MediaDetailsDialog
					altText={dialog === "details" ? image.altText : undefined}
					onClose={close}
					onSave={(altText) => {
						onChange({ kind: "imageAltText", altText });
						close();
					}}
				/>
				<BackgroundNoticeDialog
					open={dialog === "notice"}
					imageUrl={url}
					onClose={(dismissForever) => {
						if (dismissForever) {
							dismissBackgroundNotice();
						}
						close();
					}}
				/>
			</section>
		);
	}

	const message = rejected ? IMAGE_REJECTED_MESSAGE : upload.error;

	return (
		<section
			aria-label="Mídia"
			data-over={over || undefined}
			onDragOver={(event) => {
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				send(event.dataTransfer.files);
			}}
			className={cn(
				"relative flex aspect-[3/2] w-[min(100cqw,150cqh)] shrink-0 flex-col items-center justify-center gap-3 rounded-md bg-card/70 p-4 text-center sm:p-6",
				over && "bg-card ring-4 ring-primary/60",
			)}
		>
			{uploading ? (
				<div className="flex w-full max-w-xs flex-col items-center gap-2">
					<p className="font-semibold">Enviando imagem…</p>
					<progress
						value={upload.progress ?? 0}
						max={1}
						aria-label="Enviando imagem"
						className="h-2 w-full overflow-hidden rounded-full accent-primary"
					/>
				</div>
			) : (
				<>
					<Button
						variant="outline"
						size="icon-lg"
						className="shadow-sm"
						aria-label="Inserir mídia"
						onClick={() => {
							setRejected(false);
							setDialog("upload");
						}}
					>
						<PlusIcon />
					</Button>
					<p className="font-semibold text-foreground/80 text-lg">
						Encontre e insira mídia
					</p>
					{message && (
						<p role="alert" className="text-destructive text-sm">
							{message}
						</p>
					)}
					<p className="text-sm sm:absolute sm:inset-x-4 sm:bottom-4">
						<label
							htmlFor={inputId}
							className="cursor-pointer rounded-sm font-bold underline underline-offset-2 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
						>
							Carregar arquivo
							<input
								id={inputId}
								type="file"
								accept={ACCEPTED_IMAGE_TYPES.join(",")}
								className="sr-only"
								onChange={(event) => {
									const files = [...(event.target.files ?? [])];
									event.target.value = "";
									send(files);
								}}
							/>
						</label>{" "}
						ou arraste aqui para fazer upload
					</p>
				</>
			)}

			<UploadImageDialog
				open={dialog === "upload"}
				progress={upload.progress}
				error={upload.error}
				onFile={onUpload}
				onClose={close}
			/>
		</section>
	);
}
