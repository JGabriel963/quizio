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

describe("the last game of this browser (spec 008, RN-44a)", () => {
	it("remembers the PIN and the nickname of the game the player is in", () => {
		const store = createPlayerSessionStore(memoryStorage());
		expect(store.last()).toBeNull();

		store.remember({ pin: "265914", nickname: "ACT" });

		expect(store.last()).toEqual({ pin: "265914", nickname: "ACT" });

		store.remember({ pin: "569177", nickname: "Bia" });
		expect(store.last()).toEqual({ pin: "569177", nickname: "Bia" });
	});

	it("forgets it when that game's session is cleared, not another's", () => {
		const store = createPlayerSessionStore(memoryStorage());
		store.save("265914", session);
		store.remember({ pin: "265914", nickname: "ACT" });

		store.clear("569177");
		expect(store.last()).toEqual({ pin: "265914", nickname: "ACT" });

		store.clear("265914");
		expect(store.last()).toBeNull();
	});

	it("forgets it when asked, keeping the session", () => {
		const store = createPlayerSessionStore(memoryStorage());
		store.save("265914", session);
		store.remember({ pin: "265914", nickname: "ACT" });

		store.forget();

		expect(store.last()).toBeNull();
		expect(store.load("265914")).toEqual(session);
	});

	it("ignores what it did not write, and works without storage", () => {
		const storage = memoryStorage();
		storage.items.set("quizio:player:last", JSON.stringify({ pin: 265914 }));
		expect(createPlayerSessionStore(storage).last()).toBeNull();

		const none = createPlayerSessionStore(null);
		expect(() =>
			none.remember({ pin: "265914", nickname: "ACT" }),
		).not.toThrow();
		expect(none.last()).toBeNull();
		expect(() => none.forget()).not.toThrow();
	});
});
