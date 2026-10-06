/** Shared by every request whose address is unknown, so they are limited together. */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * The caller's network address, as the proxy in front of the app reports it:
 * the first entry of `x-forwarded-for`. It keys the limit on wrong game PINs
 * (spec 008, RN-39).
 */
export function clientIpOf(headers: Headers): string {
	const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	return forwarded || UNKNOWN_CLIENT_IP;
}
