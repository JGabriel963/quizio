"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@quizio/ui/lib/utils";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * A floating panel by its trigger, for content that is not a menu (a list,
 * a scroll, actions of its own): the notifications' panel (spec 040).
 */
function PopoverContent({
	className,
	side = "bottom",
	sideOffset = 8,
	align = "end",
	alignOffset = 0,
	children,
	...props
}: PopoverPrimitive.Popup.Props &
	Pick<
		PopoverPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset"
	>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						"data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 z-50 flex max-h-(--available-height) origin-(--transform-origin) flex-col overflow-hidden rounded-md bg-card text-card-foreground shadow-lg outline-none ring-1 ring-foreground/10 data-closed:animate-out data-open:animate-in",
						className,
					)}
					{...props}
				>
					{children}
				</PopoverPrimitive.Popup>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
	return (
		<PopoverPrimitive.Title
			data-slot="popover-title"
			className={cn("font-bold text-lg", className)}
			{...props}
		/>
	);
}

export { Popover, PopoverContent, PopoverTitle, PopoverTrigger };
