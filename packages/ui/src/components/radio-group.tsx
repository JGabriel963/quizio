import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			data-slot="radio-group"
			className={cn("grid w-full gap-2", className)}
			{...props}
		/>
	);
}

const radioGroupItemVariants = cva(
	"peer relative outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"group/radio-group-item flex aspect-square size-5 shrink-0 rounded-full border-2 border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
				/**
				 * A card to pick, with its own content: the theme thumbnails of the
				 * editor (spec 042). The checked one has the blue border, as the
				 * `tile` items of `Select`.
				 */
				tile: "block w-full cursor-pointer overflow-hidden rounded-md border-2 border-transparent text-left transition-colors hover:border-primary/40 data-checked:border-primary",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

function RadioGroupItem({
	className,
	variant = "default",
	children,
	...props
}: RadioPrimitive.Root.Props & VariantProps<typeof radioGroupItemVariants>) {
	return (
		<RadioPrimitive.Root
			data-slot="radio-group-item"
			data-variant={variant}
			className={cn(radioGroupItemVariants({ variant }), className)}
			{...props}
		>
			{variant === "tile" ? (
				children
			) : (
				<RadioPrimitive.Indicator
					data-slot="radio-group-indicator"
					className="flex size-4 items-center justify-center"
				>
					<span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
				</RadioPrimitive.Indicator>
			)}
		</RadioPrimitive.Root>
	);
}

export { RadioGroup, RadioGroupItem };
