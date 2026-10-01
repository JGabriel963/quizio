import { Button, buttonVariants } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { cn } from "@quizio/ui/lib/utils";
import { UploadIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
	ACCEPTED_IMAGE_TYPES,
	IMAGE_REJECTED_MESSAGE,
	pickImageFile,
} from "@/lib/question-image-upload";

/**
 * "Carregar imagem" (spec 007, RN-07, RN-08): drop, pick or paste one image.
 * It only chooses the file; the editor uploads it and closes the dialog.
 */
export function UploadImageDialog({
	open,
	progress,
	error,
	onFile,
	onClose,
}: {
	open: boolean;
	/** Fraction of the upload in progress, or null. */
	progress: number | null;
	/** Why the last upload failed, if it did. */
	error: string | null;
	onFile: (file: File) => void;
	onClose: () => void;
}) {
	const inputId = useId();
	const [rejected, setRejected] = useState(false);
	const [over, setOver] = useState(false);
	const busy = progress !== null;

	const choose = (files: Iterable<File>) => {
		if (busy) {
			return;
		}
		const file = pickImageFile(files);
		setRejected(file === null);
		if (file) {
			onFile(file);
		}
	};

	// Pasting works anywhere while the dialog is open (RN-07).
	useEffect(() => {
		if (!open) {
			return;
		}
		const onPaste = (event: ClipboardEvent) => {
			const files = [...(event.clipboardData?.files ?? [])];
			if (files.length > 0) {
				event.preventDefault();
				choose(files);
			}
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	});

	const message = rejected ? IMAGE_REJECTED_MESSAGE : error;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					setRejected(false);
					onClose();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-2xl">
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">Carregar imagem</DialogTitle>
				</DialogHeader>

				{/** biome-ignore lint/a11y/noStaticElementInteractions: a drop zone; the button inside is the keyboard path. */}
				<div
					data-slot="upload-drop-zone"
					data-over={over || undefined}
					onDragOver={(event) => {
						event.preventDefault();
						setOver(true);
					}}
					onDragLeave={() => setOver(false)}
					onDrop={(event) => {
						event.preventDefault();
						setOver(false);
						choose(event.dataTransfer.files);
					}}
					className={cn(
						"flex flex-col items-center gap-4 rounded-md border-2 border-muted-foreground/40 border-dashed bg-card px-4 py-10 text-center sm:flex-row sm:justify-center sm:text-left",
						over && "border-primary bg-primary/5",
					)}
				>
					{busy ? (
						<div className="flex w-full max-w-sm flex-col items-center gap-2">
							<p className="font-semibold">Enviando imagem…</p>
							<progress
								value={progress}
								max={1}
								aria-label="Enviando imagem"
								className="h-2 w-full overflow-hidden rounded-full accent-primary"
							/>
						</div>
					) : (
						<>
							<UploadIcon aria-hidden="true" className="size-6 shrink-0" />
							<div className="flex flex-col gap-1">
								<p className="font-bold">
									Arraste, carregue ou cole seu arquivo aqui
								</p>
								<p className="text-muted-foreground">
									Tamanho máx. do arquivo: 10 MB
								</p>
								<p className="text-muted-foreground">
									Formato: JPEG, PNG, GIF ou WebP
								</p>
								<label
									htmlFor={inputId}
									className={cn(
										buttonVariants(),
										"mt-2 cursor-pointer self-center sm:self-start",
									)}
								>
									Carregar mídia
								</label>
								<input
									id={inputId}
									type="file"
									aria-label="Carregar mídia"
									accept={ACCEPTED_IMAGE_TYPES.join(",")}
									className="sr-only"
									onChange={(event) => {
										const files = [...(event.target.files ?? [])];
										event.target.value = "";
										choose(files);
									}}
								/>
							</div>
						</>
					)}
				</div>

				{message && !busy && (
					<p role="alert" className="text-destructive text-sm">
						{message}
					</p>
				)}

				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
