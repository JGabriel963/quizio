import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { agentConnectionUsage } from "../../schema/agents";
import {
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
	user,
} from "../../schema/auth";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAgentConnectionStore } from "./drizzle-agent-connection-store";

const AT = new Date("2026-10-28T12:00:00.000Z");
const later = (ms: number) => new Date(AT.getTime() + ms);
const SCOPES = ["openid", "profile", "email", "offline_access"];

describe("DrizzleAgentConnectionStore (spec 044)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		await testDb.db.insert(oauthClient).values([
			{
				id: "c1",
				clientId: "claude",
				name: "Claude Code",
				redirectUris: ["http://localhost:4000/callback"],
			},
			{
				id: "c2",
				clientId: "chatgpt",
				name: null,
				redirectUris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
			},
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(oauthAccessToken);
		await testDb.db.delete(oauthRefreshToken);
		await testDb.db.delete(oauthConsent);
		await testDb.db.delete(agentConnectionUsage);
	});

	const store = () => createDrizzleAgentConnectionStore(testDb.db);

	/** A consent with its tokens, as Better Auth writes them on Permitir. */
	async function connect(
		id: string,
		userId: string,
		clientId: string,
		at = AT,
	) {
		await testDb.db.insert(oauthConsent).values({
			id,
			clientId,
			userId,
			scopes: SCOPES,
			createdAt: at,
			updatedAt: at,
		});
		await testDb.db.insert(oauthRefreshToken).values({
			id: `refresh-${id}`,
			token: `refresh-token-${id}`,
			clientId,
			userId,
			scopes: SCOPES,
			expiresAt: later(90 * 24 * 60 * 60 * 1000),
			createdAt: at,
		});
		await testDb.db.insert(oauthAccessToken).values({
			id: `access-${id}`,
			token: `access-token-${id}`,
			clientId,
			userId,
			refreshId: `refresh-${id}`,
			scopes: SCOPES,
			expiresAt: later(60 * 60 * 1000),
			createdAt: at,
		});
	}

	it("lists the user's consents with the client's name and redirect, and the last use", async () => {
		await connect("k1", "ana", "claude");
		await connect("k2", "ana", "chatgpt", later(1000));
		await connect("k3", "bruno", "claude");
		await store().markUsed("ana", "claude", later(5000), 60_000);

		expect(await store().listFor("ana")).toEqual([
			{
				id: "k2",
				userId: "ana",
				clientId: "chatgpt",
				clientName: null,
				redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
				connectedAt: later(1000),
				lastUsedAt: null,
			},
			{
				id: "k1",
				userId: "ana",
				clientId: "claude",
				clientName: "Claude Code",
				redirectUri: "http://localhost:4000/callback",
				connectedAt: AT,
				lastUsedAt: later(5000),
			},
		]);
		expect((await store().find("ana", "claude"))?.id).toBe("k1");
	});

	it("find returns null after the consent is deleted", async () => {
		await connect("k1", "ana", "claude");
		await testDb.db.delete(oauthConsent).where(eq(oauthConsent.id, "k1"));

		expect(await store().find("ana", "claude")).toBeNull();
	});

	it("disconnect deletes the consent, that client's tokens for the user and the usage, and only those", async () => {
		await connect("k1", "ana", "claude");
		await connect("k2", "ana", "chatgpt");
		await connect("k3", "bruno", "claude");
		await store().markUsed("ana", "claude", AT, 60_000);

		expect(await store().disconnect("bruno", "k1")).toBe(false);
		expect(await store().disconnect("ana", "k1")).toBe(true);

		expect((await store().listFor("ana")).map((record) => record.id)).toEqual([
			"k2",
		]);
		const refreshTokens = await testDb.db.select().from(oauthRefreshToken);
		expect(refreshTokens.map((row) => row.id).sort()).toEqual([
			"refresh-k2",
			"refresh-k3",
		]);
		const accessTokens = await testDb.db.select().from(oauthAccessToken);
		expect(accessTokens.map((row) => row.id).sort()).toEqual([
			"access-k2",
			"access-k3",
		]);
		expect(await testDb.db.select().from(agentConnectionUsage)).toEqual([]);
	});

	it("disconnectAll leaves other users untouched", async () => {
		await connect("k1", "ana", "claude");
		await connect("k2", "ana", "chatgpt");
		await connect("k3", "bruno", "claude");

		await store().disconnectAll("ana");

		expect(await store().listFor("ana")).toEqual([]);
		expect(await store().listFor("bruno")).toHaveLength(1);
		expect(
			(await testDb.db.select().from(oauthRefreshToken)).map((row) => row.id),
		).toEqual(["refresh-k3"]);
	});

	it("markUsed writes at most once a minute", async () => {
		await connect("k1", "ana", "claude");

		await store().markUsed("ana", "claude", AT, 60_000);
		await store().markUsed("ana", "claude", later(30_000), 60_000);
		expect((await store().find("ana", "claude"))?.lastUsedAt).toEqual(AT);

		await store().markUsed("ana", "claude", later(61_000), 60_000);
		expect((await store().find("ana", "claude"))?.lastUsedAt).toEqual(
			later(61_000),
		);
	});
});
