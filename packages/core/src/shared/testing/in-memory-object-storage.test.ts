import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "./in-memory-object-storage";

describe("InMemoryObjectStorage", () => {
	it("copies an existing object to a new key", async () => {
		const storage = new InMemoryObjectStorage();
		storage.simulateUpload("media/user-1/original.png");

		await storage.copy("media/user-1/original.png", "media/user-1/copy.png");
		await storage.delete("media/user-1/copy.png");

		expect(await storage.exists("media/user-1/original.png")).toBe(true);
		expect(storage.keys()).toEqual(["media/user-1/original.png"]);
	});

	it("refuses to copy a missing object", async () => {
		const storage = new InMemoryObjectStorage();

		await expect(
			storage.copy("media/user-1/missing.png", "media/user-1/copy.png"),
		).rejects.toThrow();
	});

	it("reads back what was put", async () => {
		const storage = new InMemoryObjectStorage();
		storage.put("sources/user-1/a.pdf", new Uint8Array([1, 2, 3]));

		expect(await storage.read("sources/user-1/a.pdf")).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it("reads null for a missing key", async () => {
		const storage = new InMemoryObjectStorage();
		storage.put("sources/user-1/a.pdf", new Uint8Array([1]));
		await storage.delete("sources/user-1/a.pdf");

		expect(await storage.read("sources/user-1/a.pdf")).toBeNull();
		expect(await storage.read("sources/user-1/b.pdf")).toBeNull();
	});
});
