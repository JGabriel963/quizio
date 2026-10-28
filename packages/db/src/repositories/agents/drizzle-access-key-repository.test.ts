import type { StoredAccessKey } from "@quizio/core/agents/application/ports/access-key-repository";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accessKey } from "../../schema/agents";
import { user } from "../../schema/auth";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAccessKeyRepository } from "./drizzle-access-key-repository";

const AT = new Date("2026-10-28T12:00:00.000Z");
const later = (ms: number) => new Date(AT.getTime() + ms);

const aKey = (
	id: string,
	overrides: Partial<StoredAccessKey> = {},
): StoredAccessKey => ({
	id,
	ownerId: "ana",
	name: `Chave ${id}`,
	start: `qz_${id}`,
	secretHash: `hash-${id}`,
	createdAt: AT,
	lastUsedAt: null,
	...overrides,
});

describe("DrizzleAccessKeyRepository (spec 044)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
			{ id: "carla", name: "Carla", email: "carla@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(accessKey);
	});

	const keys = () => createDrizzleAccessKeyRepository(testDb.db);

	it("adds, lists and finds a key by its hash", async () => {
		await keys().add(aKey("k1"), 20);
		await keys().add(aKey("k2", { createdAt: later(1000) }), 20);

		expect((await keys().listFor("ana")).map((key) => key.id)).toEqual([
			"k2",
			"k1",
		]);
		expect(await keys().findByHash("hash-k1")).toEqual({
			id: "k1",
			ownerId: "ana",
			name: "Chave k1",
			start: "qz_k1",
			createdAt: AT,
			lastUsedAt: null,
		});
		expect(await keys().findByHash("hash-unknown")).toBeNull();
	});

	it("two adds at the same time never pass the limit", async () => {
		await keys().add(aKey("k1"), 2);

		const results = await Promise.all([
			keys().add(aKey("k2"), 2),
			keys().add(aKey("k3"), 2),
		]);

		expect(results.sort()).toEqual(["added", "limit"]);
		expect(await keys().listFor("ana")).toHaveLength(2);
	});

	it("revoke only touches the owner's key", async () => {
		await keys().add(aKey("k1"), 20);

		expect(await keys().revoke("bruno", "k1")).toBe(false);
		expect(await keys().revoke("ana", "k1")).toBe(true);
		expect(await keys().findByHash("hash-k1")).toBeNull();
	});

	it("revokeAllFor removes only that owner's keys", async () => {
		await keys().add(aKey("k1"), 20);
		await keys().add(aKey("k2", { ownerId: "bruno" }), 20);

		await keys().revokeAllFor("ana");

		expect(await keys().listFor("ana")).toEqual([]);
		expect(await keys().listFor("bruno")).toHaveLength(1);
	});

	it("markUsed writes at most once a minute", async () => {
		await keys().add(aKey("k1"), 20);

		await keys().markUsed("k1", AT, 60_000);
		await keys().markUsed("k1", later(30_000), 60_000);
		expect((await keys().listFor("ana"))[0]?.lastUsedAt).toEqual(AT);

		await keys().markUsed("k1", later(61_000), 60_000);
		expect((await keys().listFor("ana"))[0]?.lastUsedAt).toEqual(later(61_000));
	});

	it("deleting the user deletes their keys", async () => {
		await keys().add(aKey("k1", { ownerId: "carla" }), 20);

		await testDb.db.delete(user).where(eq(user.id, "carla"));

		expect(await keys().findByHash("hash-k1")).toBeNull();
	});
});
