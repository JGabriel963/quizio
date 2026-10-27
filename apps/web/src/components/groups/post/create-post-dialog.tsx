import { GROUP_IMAGE_EXTENSIONS } from "@quizio/core/groups/domain/group-file";
import { GROUP_POST_MESSAGE_MAX_LENGTH } from "@quizio/core/groups/domain/group-post";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Progress } from "@quizio/ui/components/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	FileTextIcon,
	ImageIcon,
	type LucideIcon,
	ShareIcon,
	SquareCheckBigIcon,
	XIcon,
} from "lucide-react";
import { type ChangeEvent, useRef } from "react";

import { CountedField } from "@/components/groups/counted-field";
import { QuizCover } from "@/components/quiz/quiz-cover";
import { formatFileSize } from "@/lib/group-post-labels";
import type { PostAttachment } from "@/lib/group-post-state";

const IMAGE_ACCEPT = Object.keys(GROUP_IMAGE_EXTENSIONS).join(",");

/**
 * "Criar publicação" (spec 036, RN-04 to RN-08): the text with its counter,
 * "Adicionar à minha publicação" (Imagem, PDF, Compartilhar kahoot for who
 * may share, spec 037, and Atribuir kahoot for who may assign), or the
 * attachment with its X; Cancelar and Publicar. The flow around it holds the
 * state.
 */
export function CreatePostDialog({
	open,
	message,
	attachment,
	canAssign,
	canShare,
	canPublish,
	publishing,
	error,
	onMessageChange,
	onPickFile,
	onAssign,
	onShare,
	onRemoveAttachment,
	onCancel,
	onPublish,
}: {
	open: boolean;
	message: string;
	attachment: PostAttachment;
	canAssign: boolean;
	/** The admin, or members when the admin lets them (spec 037, RN-01). */
	canShare: boolean;
	canPublish: boolean;
	publishing: boolean;
	/** A refused file or a refused post. */
	error: string | null;
	onMessageChange: (message: string) => void;
	onPickFile: (type: "image" | "pdf", file: File) => void;
	onAssign: () => void;
	onShare: () => void;
	onRemoveAttachment: () => void;
	onCancel: () => void;
	onPublish: () => void;
}) {
	const imageInput = useRef<HTMLInputElement>(null);
	const pdfInput = useRef<HTMLInputElement>(null);

	const pick =
		(type: "image" | "pdf") => (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			// Choosing the same file again must fire again.
			event.target.value = "";
			if (file) {
				onPickFile(type, file);
			}
		};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onCancel();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Criar publicação</DialogTitle>
				</DialogHeader>
				<CountedField
					label="Mensagem"
					labelHidden
					value={message}
					max={GROUP_POST_MESSAGE_MAX_LENGTH}
					placeholder="Digite seu texto"
					multiline
					autoFocus
					onChange={onMessageChange}
				/>

				{attachment.kind === "none" ? (
					<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-4 py-3">
						<p className="font-bold text-sm">Adicionar à minha publicação</p>
						<div className="flex items-center gap-1">
							<AttachButton
								label="Imagem"
								icon={ImageIcon}
								onClick={() => imageInput.current?.click()}
							/>
							<AttachButton
								label="PDF"
								icon={FileTextIcon}
								onClick={() => pdfInput.current?.click()}
							/>
							{canShare && (
								<AttachButton
									label="Compartilhar kahoot"
									icon={ShareIcon}
									onClick={onShare}
								/>
							)}
							{canAssign && (
								<AttachButton
									label="Atribuir kahoot"
									icon={SquareCheckBigIcon}
									onClick={onAssign}
								/>
							)}
						</div>
						<input
							ref={imageInput}
							type="file"
							accept={IMAGE_ACCEPT}
							aria-label="Escolher imagem"
							className="hidden"
							onChange={pick("image")}
						/>
						<input
							ref={pdfInput}
							type="file"
							accept="application/pdf"
							aria-label="Escolher PDF"
							className="hidden"
							onChange={pick("pdf")}
						/>
					</div>
				) : (
					<AttachmentPreview
						attachment={attachment}
						onRemove={onRemoveAttachment}
					/>
				)}

				{error && (
					<p role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}

				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onCancel}>
						Cancelar
					</Button>
					<Button
						disabled={!canPublish || publishing}
						aria-busy={publishing || undefined}
						onClick={onPublish}
					>
						Publicar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** An icon of the bar, named by its tooltip; "Em breve" ones do nothing. */
function AttachButton({
	label,
	icon: Icon,
	soon = false,
	onClick,
}: {
	label: string;
	icon: LucideIcon;
	soon?: boolean;
	onClick?: () => void;
}) {
	const name = soon ? `${label} (em breve)` : label;
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={name}
						aria-disabled={soon || undefined}
						className={cn(
							"text-primary",
							soon && "cursor-not-allowed text-muted-foreground",
						)}
						onClick={soon ? (event) => event.preventDefault() : onClick}
					/>
				}
			>
				<Icon aria-hidden="true" />
			</TooltipTrigger>
			<TooltipContent>{name}</TooltipContent>
		</Tooltip>
	);
}

/** The attachment in the dialog, with the X that takes it out (RN-07). */
function AttachmentPreview({
	attachment,
	onRemove,
}: {
	attachment: Exclude<PostAttachment, { kind: "none" }>;
	onRemove: () => void;
}) {
	return (
		<div className="rounded-md bg-muted p-3">
			<div className="flex items-center gap-3 overflow-hidden rounded-md bg-card shadow-sm">
				{attachment.kind === "quiz" || attachment.kind === "sharedQuiz" ? (
					<QuizCover
						url={attachment.quiz.coverImageUrl ?? null}
						className="w-28 shrink-0 rounded-none"
					/>
				) : attachment.type === "image" && attachment.previewUrl ? (
					<img
						src={attachment.previewUrl}
						alt="Imagem anexada"
						className="h-20 w-28 shrink-0 object-cover"
					/>
				) : (
					<span className="flex h-20 w-20 shrink-0 items-center justify-center bg-muted">
						{attachment.type === "image" ? (
							<ImageIcon aria-hidden="true" className="size-8 text-primary" />
						) : (
							<FileTextIcon
								aria-hidden="true"
								className="size-8 text-primary"
							/>
						)}
					</span>
				)}
				<div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
					{attachment.kind === "quiz" || attachment.kind === "sharedQuiz" ? (
						<>
							<p className="truncate font-bold">{attachment.quiz.title}</p>
							{attachment.quiz.ownerName && (
								<p className="text-muted-foreground text-xs">
									{attachment.quiz.ownerName}
								</p>
							)}
						</>
					) : (
						<>
							<p className="truncate font-bold text-sm">{attachment.name}</p>
							{attachment.kind === "uploading" ? (
								<Progress
									value={Math.round(attachment.progress * 100)}
									aria-label={`Enviando ${attachment.name}`}
								/>
							) : (
								<p className="text-muted-foreground text-xs">
									{formatFileSize(attachment.sizeBytes)}
								</p>
							)}
						</>
					)}
				</div>
				<Button
					variant="outline"
					size="icon"
					className="mr-3 shrink-0"
					aria-label="Remover anexo"
					onClick={onRemove}
				>
					<XIcon />
				</Button>
			</div>
		</div>
	);
}
