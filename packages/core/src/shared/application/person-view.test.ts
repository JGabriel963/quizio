import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../testing/in-memory-object-storage";
import { personView } from "./person-view";

describe("personView", () => {
	it("builds the photo URL from the key, null without one", () => {
		const storage = new InMemoryObjectStorage();

		expect(
			personView(
				{ userId: "u1", name: "Ana", photoKey: "profiles/u1/a.webp" },
				storage,
			),
		).toEqual({
			userId: "u1",
			name: "Ana",
			photoUrl: "https://media.test/profiles/u1/a.webp",
		});
		expect(
			personView({ userId: "u2", name: "Bia", photoKey: null }, storage),
		).toEqual({ userId: "u2", name: "Bia", photoUrl: null });
	});
});
