import {
	ANSWER_CROP_SHAPES,
	type AnswerImage as StoredAnswerImage,
} from "@quizio/core/quiz/domain/answer-image";
import type { AnswerRef } from "@quizio/core/quiz/domain/question-change";
import type { ImageCrop } from "@quizio/core/quiz/domain/question-image";
import { Button } from "@quizio/ui/components/button";
import { CropIcon, InfoIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { AnswerImage } from "@/components/quiz/answer-image";

import { CropImageDialog } from "./crop-image-dialog";
import { MediaDetailsDialog } from "./media-details-dialog";

/** What the answer fields need from the editor for images (spec 049). */
export interface AnswerImageActions {
	/** The public URL of an image the editor knows. */
	urlOf: (key: string) => string | null;
	/** Opens the upload for that answer. */
	pick: (answer: AnswerRef) => void;
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

	return (
		<div
			data-slot="answer-image-field"
			className="group/answer-image relative flex min-h-12 min-w-0 flex-1 self-stretch"
		>
			<AnswerImage
				image={{ url, crop: image.crop, altText: image.altText }}
				label={`Imagem da ${label.toLowerCase()}`}
				className="@4xl:h-28 h-24"
			/>
			<div className="absolute inset-y-0 right-0 flex items-center gap-1 opacity-0 pointer-coarse:opacity-100 transition-opacity focus-within:opacity-100 group-hover/answer-image:opacity-100">
				<Button
					variant="outline"
					size="icon-sm"
					className="shadow-sm"
					aria-label={`Remover imagem da ${label.toLowerCase()}`}
					title="Remover"
					onClick={onRemove}
				>
					<Trash2Icon />
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					className="shadow-sm"
					aria-label={`Recortar imagem da ${label.toLowerCase()}`}
					title="Recortar imagem"
					disabled={url === null}
					onClick={() => setDialog("crop")}
				>
					<CropIcon />
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					className="shadow-sm"
					aria-label={`Detalhes da mídia da ${label.toLowerCase()}`}
					title="Detalhes da mídia"
					onClick={() => setDialog("details")}
				>
					<InfoIcon />
				</Button>
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
