import { FileTextIcon } from "lucide-react";

import { formatFileSize } from "@/lib/group-post-labels";

/**
 * A posted PDF: its icon, name and size; it opens in a new tab, where the
 * browser shows it and lets it be saved (spec 036, RN-11).
 */
export function PostFileCard({
	url,
	name,
	sizeBytes,
}: {
	url: string;
	name: string;
	sizeBytes: number;
}) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
		>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-destructive/10">
				<FileTextIcon aria-hidden="true" className="size-6 text-destructive" />
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="truncate font-bold text-sm">{name}</span>
				<span className="text-muted-foreground text-xs">
					PDF · {formatFileSize(sizeBytes)}
				</span>
			</span>
		</a>
	);
}
