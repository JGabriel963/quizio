import { describe, expect, it } from "vitest";

import {
	canSeeMemberEmail,
	matchesGroupSearch,
	sortMembers,
} from "./group-member";

describe("group members (spec 034)", () => {
	it("sorts the admin first, then the others by name, ignoring accents", () => {
		const sorted = sortMembers([
			{ name: "Bruno", role: "member" as const },
			{ name: "Zoe", role: "admin" as const },
			{ name: "Álvaro", role: "member" as const },
			{ name: "carla", role: "member" as const },
		]);

		expect(sorted.map((member) => member.name)).toEqual([
			"Zoe",
			"Álvaro",
			"Bruno",
			"carla",
		]);
	});

	it("matches a search without case or accents", () => {
		expect(matchesGroupSearch("Célula Sul", "celula")).toBe(true);
		expect(matchesGroupSearch("Coral", "CORÁL")).toBe(true);
		expect(matchesGroupSearch("Coral", "  ")).toBe(true);
		expect(matchesGroupSearch("Coral", "xyz")).toBe(false);
	});

	it("only the admin may see a member's email", () => {
		expect(canSeeMemberEmail("admin")).toBe(true);
		expect(canSeeMemberEmail("member")).toBe(false);
	});
});
