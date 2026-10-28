import type {
	AgentConnectionRecord,
	AgentConnectionStore,
} from "@quizio/core/agents/application/ports/agent-connection-store";
import { and, asc, desc, eq, lt, type SQL, sql } from "drizzle-orm";

import { agentConnectionUsage as usageTable } from "../../schema/agents";
import {
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
} from "../../schema/auth";
import type { Database } from "../../types";

async function selectConnections(
	db: Pick<Database, "select">,
	where: SQL | undefined,
): Promise<AgentConnectionRecord[]> {
	const rows = await db
		.select({
			id: oauthConsent.id,
			userId: oauthConsent.userId,
			clientId: oauthConsent.clientId,
			clientName: oauthClient.name,
			redirectUris: oauthClient.redirectUris,
			connectedAt: oauthConsent.createdAt,
			lastUsedAt: usageTable.lastUsedAt,
		})
		.from(oauthConsent)
		.innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
		.leftJoin(
			usageTable,
			and(
				eq(usageTable.userId, oauthConsent.userId),
				eq(usageTable.clientId, oauthConsent.clientId),
			),
		)
		.where(where)
		.orderBy(desc(oauthConsent.createdAt), asc(oauthConsent.id));
	return rows.flatMap(({ redirectUris, userId, ...row }) =>
		userId ? [{ ...row, userId, redirectUri: redirectUris[0] ?? null }] : [],
	);
}

/**
 * The agents a person allowed (spec 044, RN-14, RN-16, RN-17; ADR 0023),
 * read from the consents and clients Better Auth keeps, with the last use
 * Quizio records. Disconnecting removes the consent with that client's tokens
 * for the person, so the next request and the next refresh are refused.
 */
export function createDrizzleAgentConnectionStore(
	db: Database,
): AgentConnectionStore {
	return {
		async find(userId, clientId) {
			const [record] = await selectConnections(
				db,
				and(
					eq(oauthConsent.userId, userId),
					eq(oauthConsent.clientId, clientId),
				),
			);
			return record ?? null;
		},

		listFor(userId) {
			return selectConnections(db, eq(oauthConsent.userId, userId));
		},

		async disconnect(userId, connectionId) {
			return db.transaction(async (tx) => {
				const [consent] = await tx
					.delete(oauthConsent)
					.where(
						and(
							eq(oauthConsent.id, connectionId),
							eq(oauthConsent.userId, userId),
						),
					)
					.returning({ clientId: oauthConsent.clientId });
				if (!consent) {
					return false;
				}
				await tx
					.delete(oauthAccessToken)
					.where(
						and(
							eq(oauthAccessToken.userId, userId),
							eq(oauthAccessToken.clientId, consent.clientId),
						),
					);
				await tx
					.delete(oauthRefreshToken)
					.where(
						and(
							eq(oauthRefreshToken.userId, userId),
							eq(oauthRefreshToken.clientId, consent.clientId),
						),
					);
				await tx
					.delete(usageTable)
					.where(
						and(
							eq(usageTable.userId, userId),
							eq(usageTable.clientId, consent.clientId),
						),
					);
				return true;
			});
		},

		async disconnectAll(userId) {
			await db.transaction(async (tx) => {
				await tx
					.delete(oauthAccessToken)
					.where(eq(oauthAccessToken.userId, userId));
				await tx
					.delete(oauthRefreshToken)
					.where(eq(oauthRefreshToken.userId, userId));
				await tx.delete(oauthConsent).where(eq(oauthConsent.userId, userId));
				await tx.delete(usageTable).where(eq(usageTable.userId, userId));
			});
		},

		async markUsed(userId, clientId, at, throttleMs) {
			await db
				.insert(usageTable)
				.values({ userId, clientId, lastUsedAt: at })
				.onConflictDoUpdate({
					target: [usageTable.userId, usageTable.clientId],
					set: { lastUsedAt: sql`excluded.last_used_at` },
					setWhere: lt(
						usageTable.lastUsedAt,
						new Date(at.getTime() - throttleMs),
					),
				});
		},
	};
}
