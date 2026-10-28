import { describe, expect, it } from "vitest";

import { anAccessKey } from "./an-access-key";
import { InMemoryAccessKeyRepository } from "./in-memory-access-key-repository";

const stored = (id: string, ownerId = "ana") => ({
	...anAccessKey({ id, ownerId }),
	secretHash: `hash-${id}`,
});

describe("InMemoryAccessKeyRepository", () => {
	it("add refuses the key over the limit", async () => {
		const keys = new InMemoryAccessKeyRepository();

		expect(await keys.add(stored("k1"), 2)).toBe("added");
		expect(await keys.add(stored("k2"), 2)).toBe("added");
		expect(await keys.add(stored("k3"), 2)).toBe("limit");
		expect(await keys.add(stored("k4", "bruno"), 2)).toBe("added");
		expect((await keys.listFor("ana")).map((key) => key.id)).toEqual([
			"k2",
			"k1",
		]);
	});

	it("findByHash ignores revoked keys", async () => {
		const keys = new InMemoryAccessKeyRepository();
		await keys.add(stored("k1"), 20);

		expect((await keys.findByHash("hash-k1"))?.id).toBe("k1");
		expect(await keys.revoke("bruno", "k1")).toBe(false);
		expect(await keys.revoke("ana", "k1")).toBe(true);
		expect(await keys.findByHash("hash-k1")).toBeNull();
	});

	it("markUsed writes at most once per throttle window", async () => {
		const keys = new InMemoryAccessKeyRepository();
		await keys.add(stored("k1"), 20);

		await keys.markUsed("k1", new Date("2026-10-28T12:00:00Z"), 60_000);
		await keys.markUsed("k1", new Date("2026-10-28T12:00:30Z"), 60_000);
		expect((await keys.listFor("ana"))[0]?.lastUsedAt).toEqual(
			new Date("2026-10-28T12:00:00Z"),
		);

		await keys.markUsed("k1", new Date("2026-10-28T12:01:01Z"), 60_000);
		expect((await keys.listFor("ana"))[0]?.lastUsedAt).toEqual(
			new Date("2026-10-28T12:01:01Z"),
		);
	});

	it("revokeAllFor removes only that owner's keys", async () => {
		const keys = new InMemoryAccessKeyRepository();
		await keys.add(stored("k1"), 20);
		await keys.add(stored("k2", "bruno"), 20);

		await keys.revokeAllFor("ana");

		expect(await keys.listFor("ana")).toEqual([]);
		expect(await keys.listFor("bruno")).toHaveLength(1);
	});
});
