import type {
	AccessKeyRepository,
	StoredAccessKey,
} from "../application/ports/access-key-repository";
import type { AccessKey } from "../domain/access-key";

function withoutHash({
	secretHash: _hash,
	...key
}: StoredAccessKey): AccessKey {
	return { ...key };
}

export class InMemoryAccessKeyRepository implements AccessKeyRepository {
	/** In the order they were added; revoked keys are removed. */
	readonly #keys: StoredAccessKey[] = [];

	/** What is stored, hash included, for tests to check no secret is kept. */
	stored(): StoredAccessKey[] {
		return this.#keys.map((key) => ({ ...key }));
	}

	async add(
		key: StoredAccessKey,
		maxActive: number,
	): Promise<"added" | "limit"> {
		const owned = this.#keys.filter(
			(stored) => stored.ownerId === key.ownerId,
		).length;
		if (owned >= maxActive) {
			return "limit";
		}
		this.#keys.push({ ...key });
		return "added";
	}

	async listFor(ownerId: string): Promise<AccessKey[]> {
		return this.#keys
			.map((key, order) => ({ key, order }))
			.filter(({ key }) => key.ownerId === ownerId)
			.sort(
				(a, b) =>
					b.key.createdAt.getTime() - a.key.createdAt.getTime() ||
					b.order - a.order,
			)
			.map(({ key }) => withoutHash(key));
	}

	async findByHash(secretHash: string): Promise<AccessKey | null> {
		const key = this.#keys.find((stored) => stored.secretHash === secretHash);
		return key ? withoutHash(key) : null;
	}

	async revoke(ownerId: string, keyId: string): Promise<boolean> {
		const index = this.#keys.findIndex(
			(key) => key.id === keyId && key.ownerId === ownerId,
		);
		if (index === -1) {
			return false;
		}
		this.#keys.splice(index, 1);
		return true;
	}

	async revokeAllFor(ownerId: string): Promise<void> {
		for (let index = this.#keys.length - 1; index >= 0; index--) {
			if (this.#keys[index]?.ownerId === ownerId) {
				this.#keys.splice(index, 1);
			}
		}
	}

	async markUsed(keyId: string, at: Date, throttleMs: number): Promise<void> {
		const key = this.#keys.find((stored) => stored.id === keyId);
		if (
			key &&
			(key.lastUsedAt === null ||
				at.getTime() - key.lastUsedAt.getTime() >= throttleMs)
		) {
			key.lastUsedAt = at;
		}
	}
}
