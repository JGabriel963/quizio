/** The creator's account, which Better Auth keeps (ADR 0007). */
export interface AccountRecord {
	id: string;
	name: string;
	email: string;
}

export interface AccountRepository {
	find(userId: string): Promise<AccountRecord | null>;
	/**
	 * Deletes the account row; the database cascades everything that points
	 * at it (spec 039, RN-39; ADR 0019).
	 */
	delete(userId: string): Promise<void>;
}
