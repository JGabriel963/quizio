import type { AnswerImage as StoredAnswerImage } from "@quizio/core/quiz/domain/answer-image";
import type { ImageCrop } from "@quizio/core/quiz/domain/question-image";
import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import { cn } from "@quizio/ui/lib/utils";
import { ImageIcon } from "lucide-react";

import { cropFrameStyle, croppedImageStyle } from "@/lib/image-crop";

import { FormattedText } from "./formatted-text";

/** An answer's image as the views send it: the address only while it exists. */
export interface AnswerImageShown {
	url: string | null;
	crop: ImageCrop | null;
	altText: string | null;
}

/**
 * A stored answer image as the screens draw it, its key turned into the URL
 * the server gave (`imageUrls`): the client never builds one (ADR 0003).
 */
export function answerImageShown(
	image: StoredAnswerImage | null | undefined,
	imageUrls: Readonly<Record<string, string>>,
): AnswerImageShown | null {
	return image
		? {
				url: imageUrls[image.key] ?? null,
				crop: image.crop,
				altText: image.altText,
			}
		: null;
}

/** The name of an image answer without alt text (spec 049, RN-25). */
export function answerImageLabel(index: number): string {
	return `Imagem da resposta ${index + 1}`;
}

/**
 * An answer shown as an image (spec 049, RN-09): whole without a crop,
 * otherwise the cropped part in its shape, centered in the box the caller
 * sizes. Without an address (the report of a deleted quiz) it is an icon that
 * keeps the name.
 */
export function AnswerImage({
	image,
	label,
	decorative = false,
	className,
}: {
	image: AnswerImageShown;
	/** The name when the image has no alt text: `answerImageLabel(index)`. */
	label: string;
	decorative?: boolean;
	className?: string;
}) {
	const alt = decorative ? "" : (image.altText ?? label);
	const { crop, url } = image;

	return (
		<span
			data-slot="answer-image"
			data-crop={crop?.shape ?? "none"}
			className={cn(
				"flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden",
				className,
			)}
		>
			{url === null ? (
				<ImageIcon
					role={decorative ? undefined : "img"}
					aria-label={decorative ? undefined : alt}
					aria-hidden={decorative || undefined}
					className="size-6 opacity-70"
				/>
			) : crop ? (
				<span
					className="block h-full max-w-full overflow-hidden rounded-sm"
					style={cropFrameStyle(crop)}
				>
					<img
						src={url}
						alt={alt}
						draggable={false}
						style={croppedImageStyle(crop)}
					/>
				</span>
			) : (
				<img
					src={url}
					alt={alt}
					draggable={false}
					className="size-full rounded-sm object-contain"
				/>
			)}
		</span>
	);
}

/** An answer as screens draw it: its formatted text, or its image (spec 049). */
export function AnswerContent({
	answer,
	index,
	imageClassName,
}: {
	answer: {
		text: string | null;
		textFormatting: TextFormatting;
		image: AnswerImageShown | null;
	};
	/** The answer's position, which names an image without alt text. */
	index: number;
	imageClassName?: string;
}) {
	if (answer.image) {
		return (
			<AnswerImage
				image={answer.image}
				label={answerImageLabel(index)}
				className={imageClassName}
			/>
		);
	}
	return (
		<FormattedText
			text={answer.text ?? ""}
			formatting={answer.textFormatting}
		/>
	);
}
