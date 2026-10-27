import type { AccountRepository } from "@quizio/core/identity/application/ports/account-repository";
import { eq } from "drizzle-orm";

import { user } from "../../schema/auth";
import type { Database } from "../../types";

/**
 * The Better Auth user row. Deleting it cascades to everything that points at
 * the account (spec 039, RN-39; ADR 0019).
 */
export function createDrizzleAccountRepository(
	db: Database,
): AccountRepository {
	return {
		async find(userId) {
			const [row] = await db
				.select({ id: user.id, name: user.name, email: user.email })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);
			return row ?? null;
		},

		async delete(userId) {
			await db.delete(user).where(eq(user.id, userId));
		},
	};
}
