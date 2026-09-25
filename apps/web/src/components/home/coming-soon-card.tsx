import { Badge } from "@quizio/ui/components/badge";
import type { ReactNode } from "react";
import { useId } from "react";

/**
 * A dashboard card whose feature is planned but not delivered yet: visible,
 * marked "Em breve" and without any data (spec 002, RN-19).
 */
export function ComingSoonCard({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-3 rounded-md bg-card p-4 ring-1 ring-foreground/10"
		>
			<div className="flex items-center justify-between gap-3">
				<h2 id={titleId} className="font-bold text-lg">
					{title}
				</h2>
				<Badge variant="soon">Em breve</Badge>
			</div>
			<p className="text-muted-foreground text-sm">{children}</p>
		</section>
	);
}
