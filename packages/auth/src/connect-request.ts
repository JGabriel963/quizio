import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";

/** Who asks to connect, as the authorization screen shows it (spec 044, RN-03, RN-04). */
export interface ConnectRequest {
	clientId: string;
	/** What the agent registered as its name, if anything. */
	clientName: string | null;
	/** Where the person goes back to after answering. */
	redirectUri: string | null;
}

/**
 * Reads the signed query Better Auth sent to the authorization screen: null
 * when the signature does not hold (changed or expired) or the agent is not
 * registered, so "Conectar ao Quizio" shows that the request is not valid.
 */
export function createConnectRequestReader(
	auth: { handler: (request: Request) => Promise<Response> },
	{ secret, baseURL }: { secret: string; baseURL: string },
): (signedQuery: string, headers: Headers) => Promise<ConnectRequest | null> {
	const base = baseURL.replace(/\/$/, "");
	return async (signedQuery, headers) => {
		if (!(await verifyOAuthQueryParams(signedQuery, secret))) {
			return null;
		}
		const params = new URLSearchParams(signedQuery);
		const clientId = params.get("client_id");
		if (!clientId) {
			return null;
		}
		const response = await auth.handler(
			new Request(
				`${base}/api/auth/oauth2/public-client?${new URLSearchParams({ client_id: clientId })}`,
				{ headers },
			),
		);
		if (!response.ok) {
			return null;
		}
		const client = (await response.json()) as { client_name?: string | null };
		return {
			clientId,
			clientName: client.client_name ?? null,
			redirectUri: params.get("redirect_uri"),
		};
	};
}
