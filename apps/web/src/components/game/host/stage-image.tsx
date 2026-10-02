import {
	QUESTION_IMAGE_FALLBACK_ALT,
	QuestionImageView,
} from "@/components/editor/question-image-view";
import type { HostQuestionData } from "@/lib/api-types";

type StageImageData = NonNullable<HostQuestionData["image"]>;

/** The question's image in the middle of the host's screen, with its crop (spec 009, RN-28). */
export function StageImage({ image }: { image: StageImageData | null }) {
	if (image?.placement !== "media") {
		return null;
	}
	return (
		<QuestionImageView image={image} url={image.url} className="max-h-full" />
	);
}

/** The question's image behind the whole screen, under a veil that keeps the text readable. */
export function StageBackground({ image }: { image: StageImageData | null }) {
	if (image?.placement !== "background") {
		return null;
	}
	return (
		<div data-slot="stage-background" className="absolute inset-0">
			<img
				src={image.url}
				alt={image.altText ?? QUESTION_IMAGE_FALLBACK_ALT}
				draggable={false}
				className="size-full object-cover"
			/>
			<div className="absolute inset-0 bg-black/40" />
		</div>
	);
}
