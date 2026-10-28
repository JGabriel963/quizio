import type { ThemeFileUsage } from "../application/ports/theme-file-usage";

/** The theme files the tests say a game copied. */
export class InMemoryThemeFileUsage implements ThemeFileUsage {
	readonly #used = new Set<string>();

	/** Test helper: a game copied this file. */
	copiedByAGame(key: string): void {
		this.#used.add(key);
	}

	async inUse(keys: readonly string[]): Promise<Set<string>> {
		return new Set(keys.filter((key) => this.#used.has(key)));
	}
}
