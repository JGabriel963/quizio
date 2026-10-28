import { cn } from "@quizio/ui/lib/utils";

/**
 * Quizio's mark on the brand tile, sized by the text around it. The artwork
 * (`public/logo-mark.webp`) is white on transparent, so on the app's light
 * surfaces it always sits on the tile, as in the favicon.
 */
export function BrandMark({ className }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			data-slot="brand-mark"
			className={cn(
				"inline-flex size-[1.4em] shrink-0 items-center justify-center rounded-[0.3em] bg-linear-to-br from-brand to-brand-strong",
				className,
			)}
		>
			<img src="/logo-mark.webp" alt="" className="size-4/5" />
		</span>
	);
}

/**
 * The mark followed by the name; its accessible name is just "Quizio".
 * `nameClassName` can hide the name visually (`sr-only`) where room is short.
 */
export function BrandLogo({
	className,
	nameClassName,
}: {
	className?: string;
	nameClassName?: string;
}) {
	return (
		<span
			data-slot="brand-logo"
			className={cn("inline-flex items-center gap-[0.35em]", className)}
		>
			<BrandMark />
			<span className={nameClassName}>Quizio</span>
		</span>
	);
}
