import type { AccountCredentials } from "@quizio/core/identity/application/ports/account-credentials";

import type { Auth } from "./create-auth";

/**
 * The password only Better Auth can check (spec 039, RN-24, RN-38; ADR
 * 0019): the hash of the account's "credential" account, with its own
 * hasher. An account that only signs in with Google has none.
 */
export function createBetterAuthAccountCredentials(
	auth: Auth,
): AccountCredentials {
	async function passwordHashOf(userId: string): Promise<string | null> {
		const context = await auth.$context;
		const accounts = await context.internalAdapter.findAccounts(userId);
		const credential = accounts.find(
			(account) => account.providerId === "credential",
		);
		return credential?.password ?? null;
	}

	return {
		async hasPassword(userId) {
			return (await passwordHashOf(userId)) !== null;
		},

		async verifyPassword(userId, password) {
			const hash = await passwordHashOf(userId);
			if (!hash) {
				return false;
			}
			const context = await auth.$context;
			return context.password.verify({ hash, password });
		},
	};
}
