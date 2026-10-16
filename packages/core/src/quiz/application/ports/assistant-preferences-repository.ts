import type { GenerationOptions } from "../../domain/generation";

/** The options a creator last generated with, offered next time (spec 027, RN-07). */
export interface AssistantPreferencesRepository {
	/** Null for a creator who never generated. */
	find(ownerId: string): Promise<GenerationOptions | null>;
	save(ownerId: string, options: GenerationOptions): Promise<void>;
}
