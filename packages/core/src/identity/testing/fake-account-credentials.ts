import type { AccountCredentials } from "../application/ports/account-credentials";

/** Passwords set by hand; a user without one signs in with Google only. */
export class FakeAccountCredentials implements AccountCredentials {
	readonly #passwords = new Map<string, string>();

	setPassword(userId: string, password: string): void {
		this.#passwords.set(userId, password);
	}

	async hasPassword(userId: string): Promise<boolean> {
		return this.#passwords.has(userId);
	}

	async verifyPassword(userId: string, password: string): Promise<boolean> {
		return this.#passwords.get(userId) === password;
	}
}
