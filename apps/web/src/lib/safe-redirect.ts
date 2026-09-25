/** Where a creator lands after signing in with no page requested (spec 002, RN-02). */
export const DEFAULT_REDIRECT = "/";

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
