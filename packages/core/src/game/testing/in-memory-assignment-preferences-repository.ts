import type { AssignmentPreferencesRepository } from "../application/ports/assignment-preferences-repository";
import type { AssignmentOptions } from "../domain/assignment";

export class InMemoryAssignmentPreferencesRepository
	implements AssignmentPreferencesRepository
{
	readonly #options = new Map<string, AssignmentOptions>();

	async find(ownerId: string): Promise<AssignmentOptions | null> {
		const options = this.#options.get(ownerId);
		return options ? { ...options } : null;
	}

	async save(ownerId: string, options: AssignmentOptions): Promise<void> {
		this.#options.set(ownerId, { ...options });
	}
}
