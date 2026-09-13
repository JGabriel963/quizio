import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Solid variants use the Kahoot "pressable" edge: an inset bottom shadow that
// shrinks while pressed, with the label nudged down to match.
const pressable =
	"pb-1 shadow-press hover:brightness-90 active:not-aria-[haspopup]:translate-y-0.5 active:not-aria-[haspopup]:pb-0.5 active:not-aria-[haspopup]:shadow-press-sm";

const buttonVariants = cva(
	"group/button inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-clip-padding font-bold outline-none transition-[filter,transform,box-shadow,background-color] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: cn("bg-primary text-primary-foreground", pressable),
				brand: cn("bg-brand text-brand-foreground", pressable),
				success: cn("bg-success text-success-foreground", pressable),
				destructive: cn(
					"bg-destructive text-destructive-foreground",
					pressable,
				),
				secondary: cn(
					"bg-secondary text-secondary-foreground",
					pressable,
					"shadow-press-light hover:brightness-95",
				),
				outline:
					"border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground",
				ghost:
					"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-10 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				xs: "h-7 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-12 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 [&_svg:not([class*='size-'])]:size-5",
				xl: "h-14 px-8 text-lg has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-6",
				icon: "size-10",
				"icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			data-variant={variant}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
