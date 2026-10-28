/**
 * Proves an OAuth access token was issued for this server (spec 044, RN-02):
 * signature, issuer, audience and expiry. Implemented over Better Auth.
 */
export interface AgentTokenVerifier {
	/** Who the token is for and which agent holds it, or null when it is not valid. */
	verify(token: string): Promise<{ userId: string; clientId: string } | null>;
}
