import type { AssistantPreferencesRepository } from "../application/ports/assistant-preferences-repository";
import type { GenerationOptions } from "../domain/generation";

export class InMemoryAssistantPreferencesRepository
	implements AssistantPreferencesRepository
{
	readonly #options = new Map<string, GenerationOptions>();

	async find(ownerId: string): Promise<GenerationOptions | null> {
		const options = this.#options.get(ownerId);
		return options ? { ...options } : null;
	}

	async save(ownerId: string, options: GenerationOptions): Promise<void> {
		this.#options.set(ownerId, { ...options });
	}
}
