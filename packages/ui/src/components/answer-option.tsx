import { Button as ButtonPrimitive } from "@base-ui/react/button";
import {
	AnswerShape,
	type AnswerShapeName,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, XIcon } from "lucide-react";

export type AnswerOptionState = "idle" | "selected" | "correct" | "incorrect";

const answerOptionVariants = cva(
	"group/answer-option relative flex w-full select-none items-center gap-3 rounded-md px-4 pt-3 pb-4 text-left font-bold text-answer-foreground shadow-press outline-none transition-[filter,transform,opacity,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:translate-y-0.5 enabled:active:shadow-press-sm enabled:hover:brightness-110 disabled:cursor-default data-[state=incorrect]:opacity-40 data-[state=selected]:ring-4 data-[state=selected]:ring-foreground/80",
	{
		variants: {
			shape: {
				triangle: "bg-answer-red",
				diamond: "bg-answer-blue",
				circle: "bg-answer-yellow",
				square: "bg-answer-green",
			},
			size: {
				default: "min-h-16 text-base [&_[data-slot=answer-shape]]:size-7",
				lg: "min-h-24 text-xl [&_[data-slot=answer-shape]]:size-9",
				xl: "min-h-32 text-2xl [&_[data-slot=answer-shape]]:size-12",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

/**
 * A single answer alternative, used on the host screen (large, read-only) and
 * on player devices (tappable). Color is derived from the shape so the two can
 * never disagree.
 */
function AnswerOption({
	className,
	shape,
	size = "default",
	state = "idle",
	children,
	...props
}: ButtonPrimitive.Props &
	VariantProps<typeof answerOptionVariants> & {
		shape: AnswerShapeName;
		state?: AnswerOptionState;
	}) {
	return (
		<ButtonPrimitive
			data-slot="answer-option"
			data-shape={shape}
			data-state={state}
			aria-pressed={state === "selected" ? true : undefined}
			className={cn(answerOptionVariants({ shape, size, className }))}
			{...props}
		>
			<AnswerShape shape={shape} className="shrink-0 drop-shadow-sm" />
			<span className="min-w-0 flex-1 break-words">{children}</span>
			{state === "correct" && (
				<CheckIcon aria-hidden="true" className="size-7 shrink-0 stroke-3" />
			)}
			{state === "incorrect" && (
				<XIcon aria-hidden="true" className="size-7 shrink-0 stroke-3" />
			)}
		</ButtonPrimitive>
	);
}

export { AnswerOption, answerOptionVariants };
