import { describe, expect, it } from "vitest";

import { createPlayerSessionStore } from "./player-session";

const session = { gameId: "game-1", playerId: "p1", secret: "s3cret" };

function memoryStorage() {
	const items = new Map<string, string>();
	return {
		items,
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value),
		removeItem: (key: string) => void items.delete(key),
	};
}

describe("player session store (spec 008, RN-44)", () => {
	it("keeps one session per PIN", () => {
		const store = createPlayerSessionStore(memoryStorage());

		store.save("265914", session);

		expect(store.load("265914")).toEqual(session);
		expect(store.load("569177")).toBeNull();

		store.clear("265914");

		expect(store.load("265914")).toBeNull();
	});

	it("ignores what it did not write", () => {
		const storage = memoryStorage();
		const store = createPlayerSessionStore(storage);
		storage.items.set("quizio:player:265914", "{not json");
		storage.items.set("quizio:player:569177", JSON.stringify({ gameId: 1 }));

		expect(store.load("265914")).toBeNull();
		expect(store.load("569177")).toBeNull();
	});

	it("works without storage, and with storage that throws", () => {
		const failing = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
			removeItem: () => {
				throw new Error("blocked");
			},
		};

		for (const store of [
			createPlayerSessionStore(null),
			createPlayerSessionStore(failing),
		]) {
			expect(() => store.save("265914", session)).not.toThrow();
			expect(store.load("265914")).toBeNull();
			expect(() => store.clear("265914")).not.toThrow();
		}
	});
});
