import { describe, expect, it } from "vitest";

import { joinAddress, joinLink } from "./join-link";

describe("join link (spec 008)", () => {
	it("shows the address without the protocol", () => {
		expect(joinAddress("https://quizio.app")).toBe("quizio.app/join");
		expect(joinAddress("http://localhost:3001")).toBe("localhost:3001/join");
	});

	it("carries the PIN and the game in the link (RN-37, RN-39a)", () => {
		expect(joinLink("https://quizio.app", "265914", "game-1")).toBe(
			"https://quizio.app/join/265914?game=game-1",
		);
	});
});
