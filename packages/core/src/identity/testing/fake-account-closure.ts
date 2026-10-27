import type { AccountClosure } from "../application/ports/account-closure";

/** Records what deleting the account asked, in order. */
export class FakeAccountClosure implements AccountClosure {
	readonly calls: string[] = [];
	readonly #groupFileKeys = new Map<string, string[]>();

	setGroupFileKeys(userId: string, keys: string[]): void {
		this.#groupFileKeys.set(userId, keys);
	}

	async endGames(userId: string): Promise<void> {
		this.calls.push(`endGames:${userId}`);
	}

	async deleteManagedGroups(userId: string): Promise<void> {
		this.calls.push(`deleteManagedGroups:${userId}`);
	}

	async groupFileKeys(userId: string): Promise<string[]> {
		this.calls.push(`groupFileKeys:${userId}`);
		return this.#groupFileKeys.get(userId) ?? [];
	}
}
