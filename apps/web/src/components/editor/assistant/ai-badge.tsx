import { Badge } from "@quizio/ui/components/badge";
import { SparklesIcon } from "lucide-react";

/** "IA" with the sparkle, on what the creation assistant does (spec 027). */
export function AiBadge({ className }: { className?: string }) {
	return (
		<Badge variant="ai" className={className}>
			<SparklesIcon data-icon="inline-start" aria-hidden="true" />
			IA
		</Badge>
	);
}
