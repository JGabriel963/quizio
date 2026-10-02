import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * Tabs for the sections of an area (spec 002, RN-22). They look like tabs but
 * are links: the section lives in the URL, so back/forward and "open in a new
 * tab" must work. An ARIA tablist would promise swapped panels instead.
 */
function TabNav({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			data-slot="tab-nav"
			className={cn(
				"inline-flex w-full gap-1 overflow-x-auto rounded-md bg-muted p-1 sm:w-auto",
				className,
			)}
			{...props}
		/>
	);
}

const tabNavItemVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 font-semibold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 [&>svg]:size-4",
	{
		variants: {
			current: {
				true: "bg-card text-primary shadow-press-light",
				false: "text-muted-foreground hover:bg-card/60 hover:text-foreground",
			},
		},
		defaultVariants: {
			current: false,
		},
	},
);

function TabNavItem({
	className,
	current = false,
	render,
	...props
}: useRender.ComponentProps<"a"> &
	Omit<VariantProps<typeof tabNavItemVariants>, "current"> & {
		current?: boolean;
	}) {
	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				className: cn(tabNavItemVariants({ current }), className),
				"aria-current": current ? "page" : undefined,
			},
			props,
		),
		render,
		state: {
			slot: "tab-nav-item",
			current,
		},
	});
}

export { TabNav, TabNavItem, tabNavItemVariants };
