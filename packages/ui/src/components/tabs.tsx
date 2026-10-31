import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Tabs that swap panels on the same page (spec 044, RN-13), with the look of
 * `TabNav`. For sections that live in the address, use `TabNav` instead: its
 * items are links.
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-3", className)}
			{...props}
		/>
	);
}

const tabsListVariants = cva("inline-flex w-full overflow-x-auto", {
	variants: {
		variant: {
			default: "gap-1 rounded-md bg-muted p-1",
			/** Separate pressable buttons, as the tabs of "Insira um símbolo" (spec 047). */
			pill: "flex-wrap gap-2 bg-transparent p-0.5",
		},
	},
	defaultVariants: { variant: "default" },
});

const tabsTriggerVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 [&>svg]:size-4",
	{
		variants: {
			variant: {
				default:
					"px-4 py-2 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-press-light",
				pill: "bg-muted px-3 py-2 font-bold text-foreground shadow-press-light hover:bg-muted/70 data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-press",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

function TabsList({
	className,
	variant,
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(tabsListVariants({ variant, className }))}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	variant,
	...props
}: TabsPrimitive.Tab.Props & VariantProps<typeof tabsTriggerVariants>) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(tabsTriggerVariants({ variant, className }))}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn("outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
