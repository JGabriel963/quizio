import { cn } from "@quizio/ui/lib/utils";
import type * as React from "react";

/** Kahoot's fixed answer order: position 0 is always the red triangle, and so on. */
export const ANSWER_SHAPES = [
	"triangle",
	"diamond",
	"circle",
	"square",
] as const;

export type AnswerShapeName = (typeof ANSWER_SHAPES)[number];

export function answerShapeAt(index: number): AnswerShapeName {
	const shape = ANSWER_SHAPES[index];
	if (!shape) {
		throw new RangeError(
			`No answer shape for position ${index}; expected 0-${ANSWER_SHAPES.length - 1}`,
		);
	}
	return shape;
}

const shapePaths: Record<AnswerShapeName, React.ReactNode> = {
	triangle: <path d="M16 3 30 28H2Z" />,
	diamond: <path d="M16 1 31 16 16 31 1 16Z" />,
	circle: <circle cx="16" cy="16" r="14" />,
	square: <rect x="3" y="3" width="26" height="26" />,
};

function AnswerShape({
	shape,
	className,
	...props
}: React.ComponentProps<"svg"> & { shape: AnswerShapeName }) {
	return (
		<svg
			data-slot="answer-shape"
			data-shape={shape}
			viewBox="0 0 32 32"
			aria-hidden="true"
			className={cn("size-6 fill-current", className)}
			{...props}
		>
			{shapePaths[shape]}
		</svg>
	);
}

export { AnswerShape };
