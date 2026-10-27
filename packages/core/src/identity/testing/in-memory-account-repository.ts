import type {
	AccountRecord,
	AccountRepository,
} from "../application/ports/account-repository";

export class InMemoryAccountRepository implements AccountRepository {
	readonly #accounts = new Map<string, AccountRecord>();

	add(account: AccountRecord): void {
		this.#accounts.set(account.id, { ...account });
	}

	async find(userId: string): Promise<AccountRecord | null> {
		const account = this.#accounts.get(userId);
		return account ? { ...account } : null;
	}

	async delete(userId: string): Promise<void> {
		this.#accounts.delete(userId);
	}
}
