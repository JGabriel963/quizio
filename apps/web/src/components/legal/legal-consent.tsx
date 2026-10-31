import { cn } from "@quizio/ui/lib/utils";

/**
 * "Ao {action}, você concorda com os Termos de Uso e a Política de
 * Privacidade.", wherever someone starts to use Quizio: creating an account
 * (with the form or with Google) and joining a game or an activity. The links
 * open in another tab, so what was typed stays, and are plain anchors, so the
 * game screens and the auth forms need no router.
 */
export function LegalConsent({
	action,
	className,
}: {
	/** What the person is about to do, e.g. "criar sua conta". */
	action: string;
	className?: string;
}) {
	return (
		<p className={cn("text-xs", className)}>
			Ao {action}, você concorda com os{" "}
			<a
				href="/terms"
				target="_blank"
				rel="noreferrer"
				className="font-semibold underline underline-offset-4"
			>
				Termos de Uso
			</a>{" "}
			e a{" "}
			<a
				href="/privacy"
				target="_blank"
				rel="noreferrer"
				className="font-semibold underline underline-offset-4"
			>
				Política de Privacidade
			</a>
			.
		</p>
	);
}
