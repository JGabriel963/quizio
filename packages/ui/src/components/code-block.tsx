import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

/** How long "Copiado" stays before the button goes back to "Copiar". */
const COPIED_MS = 2000;

/**
 * A command or address to copy (spec 044, RN-13): monospace, wrapping inside
 * itself so a long line never widens the page (CA-32), with Copiar.
 */
function CodeBlock({
	code,
	label,
	className,
}: {
	code: string;
	/** What the block is, for screen readers. */
	label?: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = setTimeout(() => setCopied(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		// biome-ignore lint/a11y/useSemanticElements: a labeled code sample with its button, not a form fieldset.
		<div
			data-slot="code-block"
			role="group"
			aria-label={label}
			className={cn(
				"flex items-start gap-2 rounded-md border bg-muted/60 p-3",
				className,
			)}
		>
			<code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
				{code}
			</code>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="shrink-0"
				onClick={async () => {
					await navigator.clipboard.writeText(code);
					setCopied(true);
				}}
			>
				{copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
				{copied ? "Copiado" : "Copiar"}
			</Button>
		</div>
	);
}

export { CodeBlock };
