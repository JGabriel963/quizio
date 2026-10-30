"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const toggleVariants = cva(
	"inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-md font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
	{
		variants: {
			variant: {
				/**
				 * A button of the text formatting bar (spec 047): dark glyph on the
				 * gray bar, lighter on hover, white on dark gray when pressed.
				 */
				toolbar:
					"text-neutral-800 hover:bg-white/60 data-pressed:bg-neutral-700 data-pressed:text-white",
			},
			size: {
				default: "h-9 min-w-9 px-2 text-base",
				sm: "h-8 min-w-8 px-1.5 text-sm",
			},
		},
		defaultVariants: {
			variant: "toolbar",
			size: "default",
		},
	},
);

/** A button that stays pressed or not, with `aria-pressed`. */
function Toggle({
	className,
	variant = "toolbar",
	size = "default",
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
