/**
 * The account's password, which only Better Auth can check (ADR 0019). An
 * account that only signs in with Google has none (spec 039, RN-24).
 */
export interface AccountCredentials {
	hasPassword(userId: string): Promise<boolean>;
	verifyPassword(userId: string, password: string): Promise<boolean>;
}
