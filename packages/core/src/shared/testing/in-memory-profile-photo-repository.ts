import type { ProfilePhotoKeys } from "../application/ports/profile-photo-keys";

/**
 * The photo keys, shared by identity (which also writes them, matching its
 * `ProfilePhotoRepository`) and every context that shows people.
 */
export class InMemoryProfilePhotoRepository implements ProfilePhotoKeys {
	readonly #keys = new Map<string, string>();

	async keyOf(userId: string): Promise<string | null> {
		return this.#keys.get(userId) ?? null;
	}

	async keysOf(userIds: readonly string[]): Promise<Map<string, string>> {
		const found = new Map<string, string>();
		for (const userId of userIds) {
			const key = this.#keys.get(userId);
			if (key) {
				found.set(userId, key);
			}
		}
		return found;
	}

	async save(userId: string, key: string): Promise<string | null> {
		const previous = this.#keys.get(userId) ?? null;
		this.#keys.set(userId, key);
		return previous;
	}

	async remove(userId: string): Promise<string | null> {
		const previous = this.#keys.get(userId) ?? null;
		this.#keys.delete(userId);
		return previous;
	}
}
