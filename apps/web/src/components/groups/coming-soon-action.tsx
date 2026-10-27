import { Badge } from "@quizio/ui/components/badge";
import { cn } from "@quizio/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * An action of a later groups spec: visible, marked "Em breve" and announced
 * as unavailable, as spec 002 (RN-05) asks of every entry point to come.
 */
export function ComingSoonAction({
	label,
	icon,
	className,
	showBadge = true,
}: {
	label: string;
	icon?: ReactNode;
	className?: string;
	showBadge?: boolean;
}) {
	return (
		<button
			type="button"
			aria-disabled="true"
			aria-label={`${label} (em breve)`}
			onClick={(event) => event.preventDefault()}
			className={cn(
				"inline-flex cursor-not-allowed items-center gap-1.5 text-muted-foreground text-sm [&>svg]:size-4",
				className,
			)}
		>
			{icon}
			{label}
			{showBadge && <Badge variant="soon">Em breve</Badge>}
		</button>
	);
}
