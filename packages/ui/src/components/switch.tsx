"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const switchVariants = cva(
	"peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full bg-neutral-300 outline-none transition-colors after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-checked:bg-success data-disabled:opacity-50 dark:bg-white/25 dark:data-checked:bg-success",
	{
		variants: {
			size: {
				default: "h-6 w-11",
				sm: "h-5 w-9",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

/**
 * An on/off setting that takes effect at once, as in Kahoot's settings: green
 * when on, with the knob to the right.
 */
function Switch({
	className,
	size = "default",
	...props
}: SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(switchVariants({ size, className }))}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block rounded-full bg-white shadow-sm transition-transform",
					size === "sm"
						? "size-4 translate-x-0.5 data-checked:translate-x-4.5"
						: "size-5 translate-x-0.5 data-checked:translate-x-5.5",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch, switchVariants };
