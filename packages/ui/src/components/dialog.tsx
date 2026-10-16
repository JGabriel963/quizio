import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type * as React from "react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/40 duration-100 data-closed:animate-out data-open:animate-in",
				className,
			)}
			{...props}
		/>
	);
}

const dialogContentVariants = cva(
	"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-sm shadow-xl outline-none duration-100 data-closed:animate-out data-open:animate-in",
	{
		variants: {
			size: {
				default:
					"grid max-h-[calc(100svh-2rem)] w-full max-w-[calc(100%-2rem)] gap-5 overflow-y-auto rounded-lg p-6 sm:max-w-lg",
				/**
				 * A whole screen of its own, like Kahoot's assistant: full screen on
				 * phones, nearly all of it on larger screens. The content lays itself out.
				 */
				screen:
					"flex h-[calc(100svh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg max-sm:h-svh max-sm:w-full max-sm:max-w-none max-sm:rounded-none sm:max-w-6xl",
			},
		},
		defaultVariants: { size: "default" },
	},
);

function DialogContent({
	className,
	children,
	showCloseButton = true,
	closeLabel = "Fechar",
	size = "default",
	...props
}: DialogPrimitive.Popup.Props &
	VariantProps<typeof dialogContentVariants> & {
		showCloseButton?: boolean;
		/** Accessible label of the close button. */
		closeLabel?: string;
	}) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				data-size={size}
				className={cn(dialogContentVariants({ size, className }))}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
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
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-1 pr-8 text-left", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-bold text-lg", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-muted-foreground text-sm *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
	dialogContentVariants,
};
