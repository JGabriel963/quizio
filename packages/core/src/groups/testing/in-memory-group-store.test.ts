import { describe, expect, it } from "vitest";

import { adminOf, aGroup } from "./a-group";
import { InMemoryGroupStore } from "./in-memory-group-store";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

function setup() {
	const store = new InMemoryGroupStore();
	store.addUser({ id: "ana", name: "Ana", email: "ana@exemplo.com" });
	store.addUser({ id: "bruno", name: "Bruno", email: "bruno@exemplo.com" });
	return store;
}

describe("InMemoryGroupStore", () => {
	it("creates a group with its admin as a member", async () => {
		const store = setup();
		const group = aGroup({ id: "g1", adminId: "ana" });

		await store.create(group, adminOf(group));

		expect(await store.findById("g1")).toEqual(group);
		expect(await store.find("g1", "ana")).toMatchObject({ role: "admin" });
		expect(await store.members("g1")).toEqual([
			expect.objectContaining({ userId: "ana", name: "Ana", role: "admin" }),
		]);
	});

	it("addWithInvite adds once, reports alreadyMember, and is invalid for an old code", async () => {
		const store = setup();
		const group = aGroup({ id: "g1", adminId: "ana", inviteCode: "code-a" });
		await store.create(group, adminOf(group));
		const join = (inviteCode: string) =>
			store.addWithInvite({
				groupId: "g1",
				inviteCode,
				userId: "bruno",
				joinedAt: at(1),
			});

		expect(await join("code-a")).toBe("added");
		expect(await join("code-a")).toBe("alreadyMember");
		await store.saveInviteCode("g1", "code-b");
		await store.remove("g1", "bruno");
		expect(await join("code-a")).toBe("invalid");
		expect(await store.find("g1", "bruno")).toBeNull();
	});

	it("deleting a group removes its members and visits", async () => {
		const store = setup();
		const group = aGroup({ id: "g1", adminId: "ana" });
		await store.create(group, adminOf(group));
		await store.touch("ana", "g1", at(1));

		await store.delete("g1");

		expect(await store.findById("g1")).toBeNull();
		expect(await store.find("g1", "ana")).toBeNull();
		expect(await store.recentForUser("ana", 5)).toEqual([]);
	});

	it("recentForUser keeps only groups the user still belongs to, newest first", async () => {
		const store = setup();
		for (const id of ["g1", "g2", "g3"]) {
			const group = aGroup({ id, name: id, adminId: "ana" });
			await store.create(group, adminOf(group));
		}
		const other = aGroup({ id: "g4", name: "g4", adminId: "bruno" });
		await store.create(other, adminOf(other));
		await store.touch("ana", "g1", at(1));
		await store.touch("ana", "g2", at(2));
		await store.touch("ana", "g4", at(3));
		await store.touch("ana", "g1", at(4));

		expect(await store.recentForUser("ana", 5)).toEqual([
			{ id: "g1", name: "g1" },
			{ id: "g2", name: "g2" },
		]);
		expect(await store.recentForUser("ana", 1)).toHaveLength(1);
	});
});
