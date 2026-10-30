import {
	ANSWER_CROP_SHAPES,
	type AnswerImage as StoredAnswerImage,
} from "@quizio/core/quiz/domain/answer-image";
import type { AnswerRef } from "@quizio/core/quiz/domain/question-change";
import type { ImageCrop } from "@quizio/core/quiz/domain/question-image";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { CropIcon, ImageIcon, InfoIcon } from "lucide-react";
import { type ReactElement, useState } from "react";
import { AnswerImage } from "@/components/quiz/answer-image";

import { CropImageDialog } from "./crop-image-dialog";
import { ANSWER_IMAGE_TIP } from "./formatting-toolbar";
import { MediaDetailsDialog } from "./media-details-dialog";

/** What the answer fields need from the editor for images (spec 049). */
export interface AnswerImageActions {
	/** The public URL of an image the editor knows. */
	urlOf: (key: string) => string | null;
	/** Opens the upload for that answer. */
	pick: (answer: AnswerRef) => void;
}

/** The round white actions over the image, as Kahoot's. */
const ROUND_ACTION =
	"flex size-8 cursor-pointer items-center justify-center rounded-full bg-white text-neutral-800 shadow-md outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-3 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";

function WithTooltip({
	label,
	children,
}: {
	label: string;
	children: ReactElement;
}) {
	return (
		<Tooltip>
			<TooltipTrigger delay={150} render={children} />
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * The image icon of an empty answer (spec 049, RN-05), at its end as
 * in Kahoot, with the tip of the bar's button.
 */
export function AddAnswerImageButton({
	position,
	onClick,
}: {
	position: number;
	onClick: () => void;
}) {
	return (
		<WithTooltip label={ANSWER_IMAGE_TIP}>
			<button
				type="button"
				aria-label={`Adicionar imagem à resposta ${position}`}
				onClick={onClick}
				className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<ImageIcon aria-hidden="true" className="size-6" />
			</button>
		</WithTooltip>
	);
}

/**
 * An answer shown as its image in the editor (spec 049, RN-09 to RN-13): the
 * image in the block, cropped, and on hover or focus its three actions:
 * Remover, Recortar and Detalhes da mídia. Removing gives the text back.
 */
export function AnswerImageField({
	image,
	url,
	label,
	onRemove,
	onCrop,
	onAltText,
}: {
	image: StoredAnswerImage;
	/** Its public URL; null while the editor does not know it. */
	url: string | null;
	/** "Resposta 2": names the actions and, without alt text, the image. */
	label: string;
	onRemove: () => void;
	onCrop: (crop: ImageCrop) => void;
	onAltText: (altText: string | null) => void;
}) {
	const [dialog, setDialog] = useState<"crop" | "details" | null>(null);
	const close = () => setDialog(null);

	const name = label.toLowerCase();

	return (
		// The rest of the block stays free: the image sits after the shape and
		// the correct mark keeps its place on the right, as in Kahoot.
		<div
			data-slot="answer-image-field"
			className="flex min-w-0 flex-1 items-center self-stretch"
		>
			<div className="group/answer-image relative flex aspect-[3/2] @4xl:h-36 h-32 max-w-full shrink overflow-hidden rounded-sm bg-black/25">
				<AnswerImage
					image={{ url, crop: image.crop, altText: image.altText }}
					label={`Imagem da ${name}`}
				/>
				<div className="absolute bottom-2 left-2 flex items-center gap-1.5 opacity-0 pointer-coarse:opacity-100 transition-opacity focus-within:opacity-100 group-hover/answer-image:opacity-100">
					<WithTooltip label="Detalhes da mídia">
						<button
							type="button"
							aria-label={`Detalhes da mídia da ${name}`}
							onClick={() => setDialog("details")}
							className={ROUND_ACTION}
						>
							<InfoIcon aria-hidden="true" />
						</button>
					</WithTooltip>
					<WithTooltip label="Recortar imagem">
						<button
							type="button"
							aria-label={`Recortar imagem da ${name}`}
							disabled={url === null}
							onClick={() => setDialog("crop")}
							className={ROUND_ACTION}
						>
							<CropIcon aria-hidden="true" />
						</button>
					</WithTooltip>
					<button
						type="button"
						aria-label={`Remover imagem da ${name}`}
						onClick={onRemove}
						className="h-8 cursor-pointer rounded-md bg-white px-3 font-bold text-neutral-800 text-sm shadow-md outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-3 focus-visible:ring-white/70"
					>
						Remover
					</button>
				</div>
			</div>

			<CropImageDialog
				url={dialog === "crop" ? url : null}
				shapes={ANSWER_CROP_SHAPES}
				onClose={close}
				onSave={(crop) => {
					onCrop(crop);
					close();
				}}
			/>
			<MediaDetailsDialog
				altText={dialog === "details" ? image.altText : undefined}
				onClose={close}
				onSave={(altText) => {
					onAltText(altText);
					close();
				}}
			/>
		</div>
	);
}
