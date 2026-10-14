import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * What is missing in a field, as Kahoot's purple bubble pointing at it from
 * below. The editor shows it only for a question the creator has already left
 * once (spec 004, RN-16). It floats under its `relative` parent and takes no
 * room, so the layout does not move when it shows up (as in Kahoot).
 */
export function EditorHint({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			data-slot="editor-hint"
			className={cn(
				"pointer-events-none absolute top-full left-1/2 z-10 mt-1 w-max max-w-full -translate-x-1/2 rounded-sm bg-brand px-2.5 py-1 text-center font-bold text-brand-foreground text-sm shadow-md ring-1 ring-white/25 before:absolute before:-top-1 before:left-1/2 before:size-2.5 before:-translate-x-1/2 before:rotate-45 before:bg-brand",
				className,
			)}
			{...props}
		/>
	);
}
