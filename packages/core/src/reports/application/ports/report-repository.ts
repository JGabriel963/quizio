/**
 * The part of a report that is written: its name and the trash (spec 015;
 * ADR 0010). Each is written on its own, so renaming a report and trashing it
 * at the same time keep both.
 */
export interface ReportRepository {
	saveName(gameId: string, name: string): Promise<void>;
	/** `at` null takes them out of the trash. */
	saveTrashed(gameIds: readonly string[], at: Date | null): Promise<void>;
	/** Deletes the games, with their players, questions and answers (RN-53). */
	delete(gameIds: readonly string[]): Promise<void>;
}
