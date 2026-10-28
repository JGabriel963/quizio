import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { accessKey, agentConnectionUsage } from "../../schema/agents";
import {
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
	user,
} from "../../schema/auth";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";

const AT = new Date("2026-10-28T12:00:00.000Z");
const SCOPES = ["openid", "offline_access"];

describe("agents schema (spec 044)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	it("deleting a user cascades to keys, usage, consents and tokens", async () => {
		const { db } = testDb;
		await db
			.insert(user)
			.values({ id: "ana", name: "Ana", email: "ana@quizio.test" });
		await db.insert(oauthClient).values({
			id: "c1",
			clientId: "claude",
			redirectUris: ["http://localhost:4000/callback"],
		});
		await db.insert(accessKey).values({
			id: "k1",
			userId: "ana",
			name: "Script",
			start: "qz_abc",
			secretHash: "hash",
			createdAt: AT,
		});
		await db
			.insert(agentConnectionUsage)
			.values({ userId: "ana", clientId: "claude", lastUsedAt: AT });
		await db.insert(oauthConsent).values({
			id: "consent",
			clientId: "claude",
			userId: "ana",
			scopes: SCOPES,
			createdAt: AT,
			updatedAt: AT,
		});
		await db.insert(oauthRefreshToken).values({
			id: "refresh",
			token: "refresh-token",
			clientId: "claude",
			userId: "ana",
			scopes: SCOPES,
			expiresAt: AT,
			createdAt: AT,
		});
		await db.insert(oauthAccessToken).values({
			id: "access",
			token: "access-token",
			clientId: "claude",
			userId: "ana",
			scopes: SCOPES,
			expiresAt: AT,
			createdAt: AT,
		});

		await db.delete(user).where(eq(user.id, "ana"));

		expect(await db.select().from(accessKey)).toEqual([]);
		expect(await db.select().from(agentConnectionUsage)).toEqual([]);
		expect(await db.select().from(oauthConsent)).toEqual([]);
		expect(await db.select().from(oauthRefreshToken)).toEqual([]);
		expect(await db.select().from(oauthAccessToken)).toEqual([]);
	});
});
