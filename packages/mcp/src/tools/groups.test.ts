import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";
import { groupOf } from "../testing/fixtures";

async function people() {
	const ana = await connectTestClient({ userId: "ana" });
	const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
	const carla = await connectTestClient({ api: ana.api, userId: "carla" });
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
		["carla", "Carla"],
	] as const) {
		ana.api.groups.addUser({ id, name, email: `${id}@quizio.test` });
	}
	return { ana, bruno, carla, api: ana.api };
}

describe("group tools (spec 044, RN-29)", () => {
	it("create_group, get_group with settings and invite link for the admin, update_group with description and a permission", async () => {
		const { ana } = await people();

		const created = await ana.ok("create_group", {
			name: "Turma A",
			description: "Revisão para a prova",
		});
		const { id: groupId } = created.group as { id: string };

		expect(created).toMatchObject({
			group: {
				name: "Turma A",
				description: "Revisão para a prova",
				role: "admin",
			},
			settings: {
				permissions: {
					membersCanInvite: true,
					membersCanSeeMembers: true,
					membersCanShare: true,
					membersCanAssign: false,
				},
			},
			links: { group: `https://quizio.test/groups/${groupId}` },
		});
		expect(String((created.invite as { link: string }).link)).toMatch(
			/^https:\/\/quizio\.test\/invite\/.+/,
		);

		const updated = await ana.ok("update_group", {
			groupId,
			description: "Prova na sexta",
			permissions: { membersCanAssign: true },
		});

		expect(updated).toMatchObject({
			group: { name: "Turma A", description: "Prova na sexta" },
			settings: { permissions: { membersCanAssign: true } },
		});
	});

	it("turning off members seeing members leaves a member only the total", async () => {
		const { ana, bruno, api } = await people();
		const groupId = await groupOf(api, "ana", ["bruno", "carla"]);

		await ana.ok("update_group", {
			groupId,
			permissions: { membersCanSeeMembers: false },
		});

		const seen = await bruno.ok("get_group", { groupId });
		expect(seen.group).toMatchObject({
			memberCount: 3,
			memberPreview: [],
			abilities: { seeMembers: false },
		});
		// A member gets neither the admin's settings nor the switch's answer.
		expect(seen.settings).toBeUndefined();
		expect(
			(await bruno.call("list_group_members", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.MEMBERS_HIDDEN" });
	});

	it("a member's list of members has no emails", async () => {
		const { ana, bruno, api } = await people();
		const groupId = await groupOf(api, "ana", ["bruno"]);

		const asMember = await bruno.ok("list_group_members", { groupId });
		const asAdmin = await ana.ok("list_group_members", { groupId });

		expect(asMember.members).toEqual([
			expect.objectContaining({ userId: "ana", email: null, role: "admin" }),
			expect.objectContaining({ userId: "bruno", email: null }),
		]);
		expect(asAdmin.members).toEqual([
			expect.objectContaining({ email: "ana@quizio.test" }),
			expect.objectContaining({ email: "bruno@quizio.test" }),
		]);
	});

	it("accept_group_invite takes the whole link or the code and signals the admin", async () => {
		const { ana, bruno, carla, api } = await people();
		const created = await ana.ok("create_group", { name: "Turma A" });
		const { link } = created.invite as { link: string };
		const code = link.split("/invite/")[1] ?? "";
		api.realtime.messages.length = 0;

		const byLink = await bruno.ok("accept_group_invite", { invite: link });
		const byCode = await carla.ok("accept_group_invite", { invite: code });

		expect(byLink.group).toMatchObject({ name: "Turma A", role: "member" });
		expect(byCode.group).toMatchObject({ memberCount: 3 });
		expect(
			api.realtime.messages.filter(({ channel }) => channel === "inbox-ana"),
		).toHaveLength(2);
		expect(
			(await carla.call("accept_group_invite", { invite: "nope" })).data.error,
		).toMatchObject({ code: "GROUP.INVITE_INVALID" });
	});

	it("reset_group_invite, remove_group_member, leave_group and delete_group follow the roles", async () => {
		const { ana, bruno, carla, api } = await people();
		const groupId = await groupOf(api, "ana", ["bruno", "carla"]);
		const before = (await ana.ok("get_group", { groupId })).invite as {
			link: string;
		};

		const reset = await ana.ok("reset_group_invite", { groupId });
		expect((reset.invite as { link: string }).link).not.toBe(before.link);
		expect(
			(await bruno.call("reset_group_invite", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.NOT_ADMIN" });

		expect(
			(await bruno.call("remove_group_member", { groupId, memberId: "carla" }))
				.data.error,
		).toMatchObject({ code: "GROUP.NOT_ADMIN" });
		await ana.ok("remove_group_member", { groupId, memberId: "carla" });
		await bruno.ok("leave_group", { groupId });
		expect(
			(await ana.call("leave_group", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.ADMIN_CANNOT_LEAVE" });
		expect(
			((await ana.ok("list_group_members", { groupId })).members as unknown[])
				.length,
		).toBe(1);

		await ana.ok("delete_group", { groupId });
		expect((await ana.ok("list_groups", {})).groups).toEqual([]);
		expect(
			(await carla.call("get_group", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.NOT_FOUND" });
	});

	it("a group the caller is not in is not found", async () => {
		const { bruno, api } = await people();
		const groupId = await groupOf(api, "ana", [], "Turma A");
		await groupOf(api, "bruno", [], "Turma B");

		expect(
			(await bruno.call("get_group", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.NOT_FOUND" });
		expect(
			(await bruno.call("list_group_members", { groupId })).data.error,
		).toMatchObject({ code: "GROUP.NOT_FOUND" });
		expect((await bruno.ok("list_groups", {})).groups).toEqual([
			expect.objectContaining({ name: "Turma B", role: "admin" }),
		]);
	});
});
