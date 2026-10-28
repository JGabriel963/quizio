import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@quizio/ui/lib/utils";

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

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"inline-flex w-full gap-1 overflow-x-auto rounded-md bg-muted p-1",
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 font-semibold text-muted-foreground text-sm transition-colors hover:bg-card/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-press-light [&>svg]:size-4",
				className,
			)}
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
