"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";

const checkboxVariants = cva(
	"peer relative flex shrink-0 cursor-pointer items-center justify-center outline-none transition-colors focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed",
	{
		variants: {
			variant: {
				default:
					"size-4 rounded-md border border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-1 group-has-disabled/field:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:bg-input/30 dark:data-checked:bg-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_[data-slot=checkbox-indicator]>svg]:size-3.5",
				/**
				 * Kahoot's round "correct answer" mark on an answer block: a white
				 * ring, filled light green with a white check once marked.
				 */
				answer:
					"size-9 rounded-full border-[3px] border-answer-foreground bg-transparent text-answer-foreground focus-visible:ring-3 data-checked:bg-answer-correct data-checked:shadow-[0_2px_4px_rgb(0_0_0/0.35)] [&_[data-slot=checkbox-indicator]>svg]:size-5 [&_[data-slot=checkbox-indicator]>svg]:stroke-4 [&_[data-slot=checkbox-indicator]>svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Checkbox({
	className,
	variant = "default",
	...props
}: CheckboxPrimitive.Root.Props & VariantProps<typeof checkboxVariants>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			data-variant={variant}
			className={cn(checkboxVariants({ variant, className }))}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-content-center text-current transition-none"
			>
				<CheckIcon />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox, checkboxVariants };
