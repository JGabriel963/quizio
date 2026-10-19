import { describe, expect, it } from "vitest";

import { createAssignmentSessionStore } from "./assignment-session";

function memoryStorage() {
	const items = new Map<string, string>();
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => {
			items.set(key, value);
		},
		removeItem: (key: string) => {
			items.delete(key);
		},
	};
}

const john = { gameId: "a-1", playerId: "player-1", secret: "secret-1" };

describe("assignment session (spec 030, RN-20)", () => {
	it("remembers the participant of each activity", () => {
		const store = createAssignmentSessionStore(memoryStorage());

		store.save(john);
		store.save({ gameId: "a-2", playerId: "player-2", secret: "secret-2" });

		expect(store.load("a-1")).toEqual(john);
		expect(store.load("a-2")?.playerId).toBe("player-2");
		expect(store.load("a-3")).toBeNull();
	});

	it("forgets one activity without touching the others", () => {
		const store = createAssignmentSessionStore(memoryStorage());
		store.save(john);
		store.save({ gameId: "a-2", playerId: "player-2", secret: "secret-2" });

		store.clear("a-1");

		expect(store.load("a-1")).toBeNull();
		expect(store.load("a-2")).not.toBeNull();
	});

	it("survives a broken storage", () => {
		const broken = {
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
		const store = createAssignmentSessionStore(broken);

		expect(() => store.save(john)).not.toThrow();
		expect(store.load("a-1")).toBeNull();
		expect(createAssignmentSessionStore(null).load("a-1")).toBeNull();
	});

	it("ignores what is not a session", () => {
		const storage = memoryStorage();
		storage.setItem("quizio:assignment:a-1", "{not json");
		storage.setItem("quizio:assignment:a-2", JSON.stringify({ gameId: 1 }));
		const store = createAssignmentSessionStore(storage);

		expect(store.load("a-1")).toBeNull();
		expect(store.load("a-2")).toBeNull();
	});
});
