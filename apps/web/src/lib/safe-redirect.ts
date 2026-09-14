export const DEFAULT_REDIRECT = "/library";

/**
 * Accepts only paths inside this app, so a crafted `?redirect=` cannot send a
 * signed-in creator to another site (`//evil.com`, `https://…`, `/\evil.com`).
 */
export function safeRedirect(target: string | null | undefined): string {
	if (
		!target?.startsWith("/") ||
		target.startsWith("//") ||
		target.startsWith("/\\")
	) {
		return DEFAULT_REDIRECT;
	}
	return target;
}
