import { describe, expect, it } from "vitest";

import { DomainError } from "../../shared/domain/domain-error";
import {
	AssignNotAllowedError,
	GroupNotFoundError,
	InvalidPostMessageError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignInGroup } from "./assign-in-group";

const deadline = new Date("2026-10-29T12:00:00.000Z");
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

class DeadlineRefused extends DomainError {
	readonly code = "GAME.INVALID_DEADLINE";
}

describe("assignInGroup (spec 038)", () => {
	it("creates a plain assignment and a post, without or with a message", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const assign = createAssignInGroup(t.deps);

		const first = await assign({
			userId: "ana",
			groupId,
			quizId: "quiz-ana",
			deadline,
			options,
		});
		t.clock.advanceBy(60_000);
		const second = await assign({
			userId: "ana",
			groupId,
			quizId: "quiz-ana",
			deadline,
			options,
			message: " Revisem\naté sexta ",
		});

		expect(t.assignments.created).toEqual([
			{ ownerId: "ana", quizId: "quiz-ana", deadline, options },
			{ ownerId: "ana", quizId: "quiz-ana", deadline, options },
		]);
		const posts = await t.store.listPosts(groupId, "ana");
		expect(posts.map((post) => [post.gameId, post.message])).toEqual([
			[second.gameId, "Revisem\naté sexta"],
			[first.gameId, null],
		]);
		expect(posts[0]).toMatchObject({ authorId: "ana", kind: "assignment" });
	});

	it("an empty or blank message posts no message (spec 036, RN-15)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const assign = createAssignInGroup(t.deps);

		for (const message of ["", " \n "]) {
			await assign({
				userId: "ana",
				groupId,
				quizId: "quiz-ana",
				deadline,
				options,
				message,
			});
		}

		const posts = await t.store.listPosts(groupId, "ana");
		expect(posts.map((post) => post.message)).toEqual([null, null]);
	});

	it("a member without the switch gets GROUP.ASSIGN_NOT_ALLOWED and nothing is created", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const assign = createAssignInGroup(t.deps);
		const asBruno = {
			userId: "bruno",
			groupId,
			quizId: "quiz-bruno",
			deadline,
			options,
		};

		await expect(assign(asBruno)).rejects.toThrow(AssignNotAllowedError);
		expect(t.assignments.created).toEqual([]);

		await t.store.savePermission(groupId, "membersCanAssign", true);
		await assign(asBruno);
		expect(t.assignments.created).toHaveLength(1);
	});

	it("an invalid message creates nothing", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createAssignInGroup(t.deps)({
				userId: "ana",
				groupId,
				quizId: "quiz-ana",
				deadline,
				options,
				message: "a".repeat(501),
			}),
		).rejects.toThrow(InvalidPostMessageError);
		expect(t.assignments.created).toEqual([]);
		expect(await t.store.listPosts(groupId, "ana")).toEqual([]);
	});

	it("a refused deadline creates nothing", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		t.assignments.refuseNext(new DeadlineRefused("too far"));

		await expect(
			createAssignInGroup(t.deps)({
				userId: "ana",
				groupId,
				quizId: "quiz-ana",
				deadline,
				options,
			}),
		).rejects.toThrow(DeadlineRefused);
		expect(await t.store.listPosts(groupId, "ana")).toEqual([]);
	});

	it("an outsider gets GROUP.NOT_FOUND", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await expect(
			createAssignInGroup(t.deps)({
				userId: "bruno",
				groupId,
				quizId: "quiz-bruno",
				deadline,
				options,
			}),
		).rejects.toThrow(GroupNotFoundError);
	});
});
