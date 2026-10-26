import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createListGroups } from "./list-groups";

async function setup() {
	const t = groupsTestDeps();
	await t.aGroupOf("ana", ["bruno"], "Turma 7A");
	t.clock.advanceBy(60_000);
	await t.aGroupOf("ana", [], "Coral");
	t.clock.advanceBy(60_000);
	await t.aGroupOf("carla", ["ana"], "Célula Sul");
	t.clock.advanceBy(60_000);
	await t.aGroupOf("bruno", ["ana"], "Jovens");
	return { ...t, listGroups: createListGroups(t.deps) };
}

const names = (result: { items: { name: string }[] }) =>
	result.items.map((item) => item.name);

describe("listGroups (spec 034)", () => {
	it("splits managed and joined", async () => {
		const { listGroups } = await setup();

		const managed = await listGroups({ userId: "ana", section: "managed" });
		const joined = await listGroups({ userId: "ana", section: "joined" });

		expect(names(managed)).toEqual(["Coral", "Turma 7A"]);
		expect(names(joined)).toEqual(["Jovens", "Célula Sul"]);
		expect(
			managed.items.find((item) => item.name === "Turma 7A"),
		).toMatchObject({ memberCount: 2 });
	});

	it("orders by creation for the admin and by joining for a member, newest first", async () => {
		const t = groupsTestDeps();
		const old = await t.aGroupOf("carla", [], "Antigo");
		t.clock.advanceBy(60_000);
		await t.aGroupOf("carla", ["ana"], "Novo");
		t.clock.advanceBy(60_000);
		const group = await t.store.findById(old);
		await t.deps.groupMembers.addWithInvite({
			groupId: old,
			inviteCode: group?.inviteCode ?? "",
			userId: "ana",
			joinedAt: t.clock.now(),
		});

		const joined = await createListGroups(t.deps)({
			userId: "ana",
			section: "joined",
		});

		expect(names(joined)).toEqual(["Antigo", "Novo"]);
	});

	it("filters the section by name without case or accents", async () => {
		const { listGroups } = await setup();

		expect(
			names(
				await listGroups({
					userId: "ana",
					section: "managed",
					search: "CORÁL",
				}),
			),
		).toEqual(["Coral"]);
		expect(
			names(
				await listGroups({
					userId: "ana",
					section: "joined",
					search: "celula",
				}),
			),
		).toEqual(["Célula Sul"]);
		expect(
			names(
				await listGroups({ userId: "ana", section: "managed", search: "xyz" }),
			),
		).toEqual([]);
	});
});
