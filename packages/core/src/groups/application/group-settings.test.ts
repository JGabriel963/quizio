import { describe, expect, it } from "vitest";

import {
	GroupNotFoundError,
	InvalidGroupDescriptionError,
	InvalidGroupNameError,
	NotGroupAdminError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createGetGroup } from "./get-group";
import { createGetGroupSettings } from "./get-group-settings";
import { createSetGroupPermission } from "./set-group-permission";
import { createUpdateGroupDetails } from "./update-group-details";

describe("group settings (spec 035)", () => {
	it("the admin reads the name, the description and the switches", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		expect(
			await createGetGroupSettings(t.deps)({ userId: "ana", groupId }),
		).toEqual({
			name: "Turma 7A",
			description: "",
			permissions: {
				membersCanInvite: true,
				membersCanSeeMembers: true,
				membersCanShare: true,
				membersCanAssign: false,
			},
		});
	});

	it("renames and describes, and getGroup shows it", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);

		const saved = await createUpdateGroupDetails(t.deps)({
			userId: "ana",
			groupId,
			name: " Turma 7B ",
			description: " Revisão para a prova\nde quinta ",
		});

		expect(saved).toEqual({
			name: "Turma 7B",
			description: "Revisão para a prova\nde quinta",
		});
		expect(
			await createGetGroup(t.deps)({ userId: "bruno", groupId }),
		).toMatchObject({
			name: "Turma 7B",
			description: "Revisão para a prova\nde quinta",
		});
	});

	it("refuses an invalid name or description before writing", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const update = createUpdateGroupDetails(t.deps);

		await expect(
			update({ userId: "ana", groupId, name: " ", description: "" }),
		).rejects.toThrow(InvalidGroupNameError);
		await expect(
			update({
				userId: "ana",
				groupId,
				name: "Coral",
				description: "a".repeat(501),
			}),
		).rejects.toThrow(InvalidGroupDescriptionError);
		expect(await t.store.findById(groupId)).toMatchObject({
			name: "Turma 7A",
			description: "",
		});
	});

	it("turns one switch and reads it back; two switches keep both", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const set = createSetGroupPermission(t.deps);

		await Promise.all([
			set({
				userId: "ana",
				groupId,
				permission: "membersCanInvite",
				value: false,
			}),
			set({
				userId: "ana",
				groupId,
				permission: "membersCanAssign",
				value: true,
			}),
		]);

		const { permissions } = await createGetGroupSettings(t.deps)({
			userId: "ana",
			groupId,
		});
		expect(permissions).toMatchObject({
			membersCanInvite: false,
			membersCanAssign: true,
		});
	});

	it("share and assign are stored and read back (RN-16)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const set = createSetGroupPermission(t.deps);

		await set({
			userId: "ana",
			groupId,
			permission: "membersCanShare",
			value: false,
		});
		await set({
			userId: "ana",
			groupId,
			permission: "membersCanAssign",
			value: true,
		});

		const { permissions } = await createGetGroupSettings(t.deps)({
			userId: "ana",
			groupId,
		});
		expect(permissions).toMatchObject({
			membersCanShare: false,
			membersCanAssign: true,
		});
	});

	it("a member gets GROUP.NOT_ADMIN on settings, details and switches; an outsider GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const asBruno = { userId: "bruno", groupId };

		await expect(createGetGroupSettings(t.deps)(asBruno)).rejects.toThrow(
			NotGroupAdminError,
		);
		await expect(
			createUpdateGroupDetails(t.deps)({
				...asBruno,
				name: "Meu",
				description: "",
			}),
		).rejects.toThrow(NotGroupAdminError);
		await expect(
			createSetGroupPermission(t.deps)({
				...asBruno,
				permission: "membersCanInvite",
				value: false,
			}),
		).rejects.toThrow(NotGroupAdminError);
		await expect(
			createGetGroupSettings(t.deps)({ userId: "carla", groupId }),
		).rejects.toThrow(GroupNotFoundError);
		expect(
			(await t.store.findById(groupId))?.permissions.membersCanInvite,
		).toBe(true);
	});
});
