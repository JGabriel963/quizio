/**
 * What every response of the app carries (audit L10): no page may be framed
 * by another site, the browser takes each file for the type it is sent as,
 * and other sites get only the origin as referrer. A full Content Security
 * Policy waits for its report-only round: Pusher, the bucket and Google
 * have to be listed first.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
	"x-frame-options": "DENY",
	"content-security-policy": "frame-ancestors 'none'",
	"x-content-type-options": "nosniff",
	"referrer-policy": "strict-origin-when-cross-origin",
};

/**
 * The response with the security headers added; a header the route set itself
 * is kept. A response whose headers cannot change (a redirect or a fetched
 * one) is copied into a new one, with the same status and body.
 */
export function withSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) {
			headers.set(name, value);
		}
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
