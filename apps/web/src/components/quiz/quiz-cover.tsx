import { cn } from "@quizio/ui/lib/utils";

/** Quiz cover image, or the default purple placeholder when there is none (RN-15). */
export function QuizCover({
	url,
	alt = "",
	className,
}: {
	url: string | null;
	alt?: string;
	className?: string;
}) {
	if (url) {
		return (
			<img
				src={url}
				alt={alt}
				className={cn(
					"aspect-video w-full rounded-md bg-muted object-cover",
					className,
				)}
			/>
		);
	}
	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex aspect-video w-full items-center justify-center rounded-md bg-linear-to-br from-brand to-brand-strong font-black text-brand-foreground/80 text-sm tracking-tight",
				className,
			)}
		>
			Quizio
		</div>
	);
}
