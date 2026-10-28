import type { InMemoryQuizRepository } from "../../quiz/testing/in-memory-quiz-repository";
import type { ThemeLook } from "../../shared/domain/theme-look";
import type {
	CustomThemeRepository,
	CustomThemeWithUsage,
} from "../application/ports/custom-theme-repository";
import type {
	ThemeUpload,
	ThemeUploadRepository,
} from "../application/ports/theme-upload-repository";
import type { CustomTheme } from "../domain/custom-theme";

/**
 * The themes and their pending uploads in one store, as the database keeps
 * them. Given the quizzes, it counts their use and clears them on delete,
 * as the foreign key with `SET NULL` does (spec 043, RN-19).
 */
export class InMemoryThemeStore
	implements CustomThemeRepository, ThemeUploadRepository
{
	readonly #themes = new Map<string, CustomTheme>();
	readonly #uploads = new Map<string, ThemeUpload>();

	constructor(private readonly quizzes?: InMemoryQuizRepository) {}

	async findById(id: string): Promise<CustomTheme | null> {
		return this.#themes.get(id) ?? null;
	}

	/** What the quiz's `CustomThemeReads` asks, answered from the same store. */
	async findOwned(ownerId: string, id: string) {
		const theme = this.#themes.get(id);
		return theme && theme.ownerId === ownerId
			? { id: theme.id, look: theme.look }
			: null;
	}

	/** Test helper: a theme's look now, as a query joining it reads it. */
	lookOf(id: string | null): ThemeLook | null {
		return (id && this.#themes.get(id)?.look) || null;
	}

	async listByOwner(ownerId: string): Promise<CustomThemeWithUsage[]> {
		const quizzes = this.quizzes?.all() ?? [];
		return [...this.#themes.values()]
			.filter((theme) => theme.ownerId === ownerId)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.map((theme) => ({
				...theme,
				quizCount: quizzes.filter((quiz) => quiz.customThemeId === theme.id)
					.length,
			}));
	}

	async createTakingUploads(
		theme: CustomTheme,
		uploadKeys: readonly string[],
	): Promise<"ok" | "uploadMissing"> {
		return this.#writeTaking(theme, uploadKeys);
	}

	async updateTakingUploads(
		theme: CustomTheme,
		uploadKeys: readonly string[],
	): Promise<"ok" | "uploadMissing"> {
		return this.#writeTaking(theme, uploadKeys);
	}

	async delete(id: string): Promise<void> {
		this.#themes.delete(id);
		for (const quiz of this.quizzes?.all() ?? []) {
			if (quiz.customThemeId === id) {
				await this.quizzes?.save({ ...quiz, customThemeId: null });
			}
		}
	}

	async addThemeUpload(upload: ThemeUpload): Promise<void> {
		this.#uploads.set(upload.key, upload);
	}

	async removeThemeUpload(key: string, ownerId: string): Promise<boolean> {
		if (this.#uploads.get(key)?.ownerId !== ownerId) {
			return false;
		}
		return this.#uploads.delete(key);
	}

	async takeExpiredThemeUploads(
		before: Date,
		limit: number,
	): Promise<string[]> {
		const expired = [...this.#uploads.values()]
			.filter((upload) => upload.createdAt < before)
			.slice(0, limit)
			.map((upload) => upload.key);
		for (const key of expired) {
			this.#uploads.delete(key);
		}
		return expired;
	}

	/** Test helper: the keys still pending. */
	pendingUploadKeys(): string[] {
		return [...this.#uploads.keys()];
	}

	#writeTaking(
		theme: CustomTheme,
		uploadKeys: readonly string[],
	): "ok" | "uploadMissing" {
		const pending = uploadKeys.every(
			(key) => this.#uploads.get(key)?.ownerId === theme.ownerId,
		);
		if (!pending) {
			return "uploadMissing";
		}
		for (const key of uploadKeys) {
			this.#uploads.delete(key);
		}
		this.#themes.set(theme.id, theme);
		return "ok";
	}
}
