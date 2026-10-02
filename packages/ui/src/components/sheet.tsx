import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type * as React from "react";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
	return (
		<SheetPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				"data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/40 duration-150 data-closed:animate-out data-open:animate-in",
				className,
			)}
			{...props}
		/>
	);
}

const sheetVariants = cva(
	"fixed z-50 flex flex-col bg-popover text-popover-foreground text-sm shadow-xl outline-none duration-200 data-closed:animate-out data-open:animate-in",
	{
		variants: {
			side: {
				right:
					"data-closed:slide-out-to-right data-open:slide-in-from-right inset-y-0 right-0 h-full w-full max-w-md",
				left: "data-closed:slide-out-to-left data-open:slide-in-from-left inset-y-0 left-0 h-full w-full max-w-md",
			},
		},
		defaultVariants: {
			side: "right",
		},
	},
);

/**
 * A panel held to a side of the screen, over the page: what is behind it
 * stays as it is and keeps running. The body scrolls on its own.
 */
function SheetContent({
	className,
	children,
	side = "right",
	showCloseButton = true,
	closeLabel = "Fechar",
	...props
}: SheetPrimitive.Popup.Props &
	VariantProps<typeof sheetVariants> & {
		showCloseButton?: boolean;
		/** Accessible label of the close button. */
		closeLabel?: string;
	}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Popup
				data-slot="sheet-content"
				data-side={side}
				className={cn(sheetVariants({ side, className }))}
				{...props}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close
						data-slot="sheet-close"
						render={
							<Button
								variant="ghost"
								className="absolute top-3 right-3"
								size="icon-sm"
							/>
						}
					>
						<XIcon />
						<span className="sr-only">{closeLabel}</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Popup>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex shrink-0 flex-col gap-1 border-b px-5 py-4 pr-12",
				className,
			)}
			{...props}
		/>
	);
}

/** The part that scrolls, between the header and the footer. */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-body"
			className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn(
				"shrink-0 border-t px-5 py-3 text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("font-bold text-lg", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: SheetPrimitive.Description.Props) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
