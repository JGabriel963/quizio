import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

/** Ana's group with Bruno as a member; Carla is outside. */
async function setup() {
	const api = createTestApi();
	for (const id of ["ana", "bruno", "carla"]) {
		api.groups.addUser({
			id,
			name: id[0]?.toUpperCase() + id.slice(1),
			email: `${id}@exemplo.com`,
		});
	}
	const ana = api.callerFor("ana");
	const bruno = api.callerFor("bruno");
	const carla = api.callerFor("carla");
	const { groupId } = await ana.group.create({ name: "Turma 7A" });
	const { code } = await ana.group.invite.get({ groupId });
	await bruno.group.invite.accept({ code });
	return { api, ana, bruno, carla, groupId, code };
}

/** The domain error behind a tRPC error, as the client's `data.domainCode`. */
const domainCode = (error: unknown) =>
	(error as { cause?: { code?: string } }).cause?.code;

describe("group router (spec 034)", () => {
	it("every procedure needs a session", async () => {
		const { api, groupId } = await setup();
		const visitor = api.callerFor(null);

		await expect(
			visitor.group.list({ section: "managed" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(visitor.group.get({ groupId })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			visitor.group.invite.find({ code: "x" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("group.create returns the id and group.list shows it in managed", async () => {
		const { ana, bruno, groupId } = await setup();

		expect(await ana.group.list({ section: "managed" })).toMatchObject({
			items: [{ id: groupId, name: "Turma 7A", memberCount: 2 }],
		});
		expect(await bruno.group.list({ section: "joined" })).toMatchObject({
			items: [{ id: groupId }],
		});
		expect(await ana.group.get({ groupId })).toMatchObject({
			role: "admin",
			adminName: "Ana",
			memberCount: 2,
		});
	});

	it("refuses a 21-character name sent directly (GROUP.INVALID_NAME)", async () => {
		const { ana } = await setup();

		const error = await ana.group
			.create({ name: "a".repeat(21) })
			.catch((e) => e);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
		expect(domainCode(error)).toBe("GROUP.INVALID_NAME");
	});

	it("a non-member gets NOT_FOUND on get, members, visit and invite.get", async () => {
		const { carla, groupId } = await setup();

		for (const call of [
			carla.group.get({ groupId }),
			carla.group.members({ groupId }),
			carla.group.visit({ groupId }),
			carla.group.invite.get({ groupId }),
		]) {
			const error = await call.catch((e) => e);
			expect(error).toMatchObject({ code: "NOT_FOUND" });
			expect(domainCode(error)).toBe("GROUP.NOT_FOUND");
		}
	});

	it("a member gets BAD_REQUEST GROUP.NOT_ADMIN on admin actions", async () => {
		const { bruno, groupId } = await setup();

		for (const call of [
			bruno.group.invite.get({ groupId }),
			bruno.group.invite.reset({ groupId }),
			bruno.group.removeMember({ groupId, userId: "ana" }),
			bruno.group.delete({ groupId }),
			bruno.group.dismissSetup({ groupId }),
		]) {
			const error = await call.catch((e) => e);
			expect(error).toMatchObject({ code: "BAD_REQUEST" });
			expect(domainCode(error)).toBe("GROUP.NOT_ADMIN");
		}
	});

	it("invite.find answers pending, member and invalid; invite.accept joins", async () => {
		const { ana, carla, groupId, code } = await setup();

		expect(await carla.group.invite.find({ code })).toEqual({
			status: "pending",
			groupId,
			name: "Turma 7A",
		});
		expect(await ana.group.invite.find({ code })).toEqual({
			status: "member",
			groupId,
		});
		expect(await carla.group.invite.accept({ code })).toEqual({ groupId });
		const { code: newCode } = await ana.group.invite.reset({ groupId });
		expect(newCode).not.toBe(code);
		expect(await carla.group.invite.find({ code })).toEqual({
			status: "invalid",
		});
		const error = await acceptOutcome(carla, code);
		expect(domainCode(error)).toBe("GROUP.INVITE_INVALID");
	});

	it("members omits emails for a member", async () => {
		const { ana, bruno, groupId } = await setup();

		const forAdmin = await ana.group.members({ groupId });
		const forMember = await bruno.group.members({ groupId, search: "bru" });

		expect(forAdmin.items.map((item) => item.email)).toEqual([
			"ana@exemplo.com",
			"bruno@exemplo.com",
		]);
		expect(forMember).toEqual({
			total: 2,
			items: [{ userId: "bruno", name: "Bruno", email: null, role: "member" }],
		});
	});

	it("removes, leaves and deletes", async () => {
		const { ana, bruno, carla, groupId, code } = await setup();
		await carla.group.invite.accept({ code });

		const removeAdmin = await ana.group
			.removeMember({ groupId, userId: "ana" })
			.catch((e) => e);
		expect(domainCode(removeAdmin)).toBe("GROUP.CANNOT_REMOVE_ADMIN");
		await ana.group.removeMember({ groupId, userId: "bruno" });
		await expect(bruno.group.get({ groupId })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		const adminLeaves = await ana.group.leave({ groupId }).catch((e) => e);
		expect(domainCode(adminLeaves)).toBe("GROUP.ADMIN_CANNOT_LEAVE");
		await carla.group.leave({ groupId });
		expect((await ana.group.members({ groupId })).total).toBe(1);
		await ana.group.delete({ groupId });
		expect(await ana.group.list({ section: "managed" })).toEqual({ items: [] });
	});

	it("visits feed the recent groups", async () => {
		const { ana, groupId } = await setup();

		await ana.group.visit({ groupId });

		expect(await ana.group.recent()).toEqual({
			items: [{ id: groupId, name: "Turma 7A" }],
		});
	});
});

function acceptOutcome(
	caller: Awaited<ReturnType<typeof setup>>["carla"],
	code: string,
) {
	return caller.group.invite.accept({ code }).catch((e) => e);
}
