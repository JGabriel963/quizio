export const DEFAULT_CLIENT_IP_HEADER = "x-forwarded-for";

/**
 * The header the proxy in front of the app reports the client's address in;
 * it keys the rate limits, so it must be one a client cannot set alone.
 * Vercel overwrites x-forwarded-for, and development has no proxy. Anywhere
 * else in production the app does not start until it is chosen: behind a
 * proxy of your own, the default would let anybody escape the limits by
 * sending the header themselves (audit L2; docs/deploy.md, VPS).
 */
export function resolveClientIpHeader(
	configured: string | undefined,
	runtime: { nodeEnv: string; onVercel: boolean; skipValidation: boolean },
): string {
	if (configured) {
		return configured;
	}
	if (
		runtime.nodeEnv === "production" &&
		!runtime.onVercel &&
		!runtime.skipValidation
	) {
		throw new Error(
			"Set CLIENT_IP_HEADER in production outside Vercel: the header your proxy writes and a client cannot (docs/deploy.md, VPS).",
		);
	}
	return DEFAULT_CLIENT_IP_HEADER;
}
