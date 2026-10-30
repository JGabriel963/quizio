import type { TextFormatting } from "@quizio/core/shared/domain/text-formatting";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, EqualIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import {
	AnswerImage,
	type AnswerImageShown,
	answerImageLabel,
} from "@/components/quiz/answer-image";
import { FormattedText } from "@/components/quiz/formatted-text";

/**
 * One answer of a puzzle in a game (spec 033): the color and shape it was
 * drawn with, its text when there is one, and on the right what the screen
 * needs: the ≡ to move it, or the ✓ of the results.
 */
export function PuzzleBlock({
	shapeIndex,
	text,
	textFormatting,
	image = null,
	end,
	className,
	...props
}: {
	shapeIndex: number;
	text: string | null;
	/** Its marked stretches (spec 048, RN-19); none from a server before it. */
	textFormatting?: TextFormatting;
	/** An image answer in place of the text (spec 049, RN-22). */
	image?: AnswerImageShown | null;
	/** What sits on the right. */
	end?: ReactNode;
} & ComponentProps<"div">) {
	const shape = answerShapeAt(shapeIndex);
	return (
		<div
			data-slot="puzzle-block"
			className={cn(
				"flex min-h-14 items-center gap-3 rounded-md pr-1 pl-3 font-bold text-answer-foreground shadow-press",
				ANSWER_COLOR_CLASSES[shape],
				className,
			)}
			{...props}
		>
			<AnswerShape shape={shape} className="size-5 shrink-0" />
			{image ? (
				<span className="flex h-12 min-w-0 flex-1 py-1">
					<AnswerImage
						image={image}
						label={answerImageLabel(shapeIndex)}
						className="justify-start"
					/>
				</span>
			) : (
				<span className="min-w-0 flex-1 break-words">
					{text !== null && (
						<FormattedText text={text} formatting={textFormatting} />
					)}
				</span>
			)}
			{end}
		</div>
	);
}

/** The ≡ of a block that moves; the props are the drag's and the keyboard's. */
export function PuzzleBlockHandle(props: ComponentProps<"button">) {
	return (
		<button
			type="button"
			{...props}
			className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-md outline-none focus-visible:ring-3 focus-visible:ring-white/70 active:cursor-grabbing"
		>
			<EqualIcon className="size-6" />
		</button>
	);
}

/** The ≡ of a block's copy that follows the pointer: drawn, not a control. */
export function PuzzleBlockGrip() {
	return (
		<span
			aria-hidden="true"
			className="flex w-11 shrink-0 items-center justify-center self-stretch"
		>
			<EqualIcon className="size-6" />
		</span>
	);
}

/** The ✓ of a block in the right order, in the results (spec 033, RN-26). */
export function PuzzleBlockCheck() {
	return <CheckIcon aria-hidden="true" className="size-7 shrink-0" />;
}
