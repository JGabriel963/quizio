import type { ThemeId } from "../../../shared/domain/theme";
import type { Quiz } from "../../domain/quiz";
import type { QuizVisibility } from "../../domain/quiz-details";

export interface QuizRepository {
	findById(id: string): Promise<Quiz | null>;
	/** Inserts or replaces the whole quiz. */
	save(quiz: Quiz): Promise<void>;
	/**
	 * Sets only the marks of an edit of the questions. Editor operations use
	 * this, so they never overwrite a concurrent change to the quiz details
	 * (spec 003); `hasUnpublishedChanges` comes with spec 006, RN-19.
	 */
	markEdited(
		id: string,
		change: { updatedAt: Date; hasUnpublishedChanges: boolean },
	): Promise<void>;
	/**
	 * Sets only the visibility, from the library's menu (spec 039, RN-25a), so
	 * it never overwrites a concurrent change to the rest of the quiz.
	 */
	saveVisibility(
		id: string,
		change: { visibility: QuizVisibility; updatedAt: Date },
	): Promise<void>;
	/** Sets only the theme, chosen in the editor (spec 042, RN-06). */
	saveTheme(
		id: string,
		change: { themeId: ThemeId; updatedAt: Date },
	): Promise<void>;
	/** Every quiz of the owner, trashed ones too, for deleting the account (spec 039). */
	listIdsByOwner(ownerId: string): Promise<string[]>;
	delete(id: string): Promise<void>;
}
