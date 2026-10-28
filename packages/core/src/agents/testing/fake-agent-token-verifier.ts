import type { AgentTokenVerifier } from "../application/ports/agent-token-verifier";

/** Accepts only the tokens issued here by hand. */
export class FakeAgentTokenVerifier implements AgentTokenVerifier {
	readonly #tokens = new Map<string, { userId: string; clientId: string }>();

	issue(token: string, holder: { userId: string; clientId: string }): void {
		this.#tokens.set(token, holder);
	}

	async verify(
		token: string,
	): Promise<{ userId: string; clientId: string } | null> {
		const holder = this.#tokens.get(token);
		return holder ? { ...holder } : null;
	}
}
