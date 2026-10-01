import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * What is missing in a field, as Kahoot's purple bubble pointing at it from
 * below. The editor shows it only for a question the creator has already left
 * once (spec 004, RN-16).
 */
export function EditorHint({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			data-slot="editor-hint"
			className={cn(
				"relative z-10 mx-auto w-fit rounded-sm bg-brand px-2.5 py-1 text-center font-bold text-brand-foreground text-sm shadow-md ring-1 ring-white/25 before:absolute before:-top-1 before:left-1/2 before:size-2.5 before:-translate-x-1/2 before:rotate-45 before:bg-brand",
				className,
			)}
			{...props}
		/>
	);
}
