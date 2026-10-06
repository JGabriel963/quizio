/** Shared by every request whose address is unknown, so they are limited together. */
export const UNKNOWN_CLIENT_IP = "unknown";

export const DEFAULT_CLIENT_IP_HEADER = "x-forwarded-for";

/**
 * The caller's network address, as the proxy in front of the app reports it:
 * the first entry of `header`, which has to be one the proxy sets and a client
 * cannot. It keys the limit on wrong game PINs (spec 008, RN-39).
 */
export function clientIpOf(
	headers: Headers,
	header = DEFAULT_CLIENT_IP_HEADER,
): string {
	const forwarded = headers.get(header)?.split(",")[0]?.trim();
	return forwarded || UNKNOWN_CLIENT_IP;
}
