import type { QuestionImage } from "@quizio/core/quiz/domain/question-image";
import { cn } from "@quizio/ui/lib/utils";

import { cropFrameStyle, croppedImageStyle } from "@/lib/image-crop";

export const QUESTION_IMAGE_FALLBACK_ALT = "Imagem da pergunta";

/**
 * How a thumbnail shows the image: a background fills the screen, so its crop
 * (kept for when it is back in the middle) does not apply (spec 007, RN-24).
 */
export function thumbnailImage(
	image: QuestionImage,
): Pick<QuestionImage, "crop" | "altText"> {
	return image.placement === "background" ? { ...image, crop: null } : image;
}

/**
 * A question's image in the middle placement (spec 007, RN-14): whole when it
 * has no crop, otherwise the cropped part in its shape, centered in the box.
 * The box is sized by the caller; `decorative` hides it from screen readers
 * (thumbnails).
 */
export function QuestionImageView({
	image,
	url,
	decorative = false,
	className,
}: {
	image: Pick<QuestionImage, "crop" | "altText">;
	url: string;
	decorative?: boolean;
	className?: string;
}) {
	const alt = decorative ? "" : (image.altText ?? QUESTION_IMAGE_FALLBACK_ALT);
	const { crop } = image;

	return (
		<span
			data-slot="question-image"
			data-crop={crop?.shape ?? "none"}
			className={cn(
				"flex size-full items-center justify-center overflow-hidden",
				className,
			)}
		>
			{crop ? (
				<span
					className="block h-full max-w-full overflow-hidden"
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
					className="size-full object-contain"
				/>
			)}
		</span>
	);
}
