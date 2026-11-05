import { cn } from "@quizio/ui/lib/utils";

import { LegalConsent } from "@/components/legal/legal-consent";

/**
 * The Terms and the Privacy Policy at the foot of a game's entry screen, as
 * Kahoot keeps its links: away from the form, so the screen stays laid out as
 * it was. Its screen must be `relative` and leave room at the bottom.
 */
export function GameLegalFooter({
	action,
	className,
}: {
	/** What the person is about to do, e.g. "entrar no jogo". */
	action: string;
	className?: string;
}) {
	return (
		<footer
			data-slot="legal-footer"
			className={cn(
				"absolute inset-x-4 bottom-4 flex justify-center",
				className,
			)}
		>
			<LegalConsent
				action={action}
				className="max-w-sm text-center text-game-fg/80"
			/>
		</footer>
	);
}
