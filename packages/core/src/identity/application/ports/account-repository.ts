/** The creator's account, which Better Auth keeps (ADR 0007). */
export interface AccountRecord {
	id: string;
	name: string;
	email: string;
}

export interface AccountRepository {
	find(userId: string): Promise<AccountRecord | null>;
	/** Writes the account's name, already checked (spec 044, RN-19). */
	rename(userId: string, name: string): Promise<void>;
	/**
	 * Deletes the account row; the database cascades everything that points
	 * at it (spec 039, RN-39; ADR 0019).
	 */
	delete(userId: string): Promise<void>;
}
