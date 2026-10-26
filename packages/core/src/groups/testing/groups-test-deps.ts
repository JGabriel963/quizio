import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { createAcceptGroupInvite } from "../application/accept-group-invite";
import { createCreateGroup } from "../application/create-group";
import { InMemoryGroupAssignments } from "./in-memory-group-assignments";
import { InMemoryGroupStore } from "./in-memory-group-store";
import { SequentialInviteCodeGenerator } from "./sequential-invite-code-generator";

/**
 * The groups' ports over one store, with Ana, Bruno and Carla as accounts,
 * and shortcuts to create a group and to join it by its link.
 */
export function groupsTestDeps() {
	const store = new InMemoryGroupStore();
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
		["carla", "Carla"],
	] as const) {
		store.addUser({ id, name, email: `${id}@exemplo.com` });
	}
	const clock = new FixedClock("2026-10-26T12:00:00.000Z");
	// Quizzes of Ana and Bruno to assign (spec 038).
	const assignments = new InMemoryGroupAssignments();
	for (const [ownerId, ownerName] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
	] as const) {
		assignments.addQuiz({
			id: `quiz-${ownerId}`,
			ownerId,
			ownerName,
			title: `Capitais de ${ownerName}`,
			questionCount: 5,
			coverImageKey: `media/${ownerId}/cover.png`,
		});
	}
	const deps = {
		groups: store,
		groupMembers: store,
		groupVisits: store,
		groupReads: store,
		groupPosts: store,
		groupFeed: store,
		groupAssignments: assignments,
		groupAssignmentQuery: assignments,
		storage: new InMemoryObjectStorage("https://media.test"),
		ids: new SequentialIdGenerator("group"),
		inviteCodes: new SequentialInviteCodeGenerator(),
		clock,
	};
	const createGroup = createCreateGroup(deps);
	const acceptInvite = createAcceptGroupInvite(deps);

	/** Ana's group, with the given members joined by its link. */
	async function aGroupOf(
		adminId = "ana",
		members: readonly string[] = [],
		name = "Turma 7A",
	) {
		const { groupId } = await createGroup({ userId: adminId, name });
		const group = await store.findById(groupId);
		for (const userId of members) {
			clock.advanceBy(60_000);
			await acceptInvite({ userId, code: group?.inviteCode ?? "" });
		}
		return groupId;
	}

	return { store, clock, deps, aGroupOf, assignments };
}
