import { somePlayableQuestions } from "@quizio/core/game/testing/game-deps";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { aReportGame } from "@quizio/core/reports/testing/a-report-game";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const DAY_MS = 24 * 60 * 60 * 1000;
// The test clock reads 2026-06-01T12:00:00.000Z.
const inDays = (days: number) =>
	new Date(
		Date.parse("2026-06-01T12:00:00.000Z") + days * DAY_MS,
	).toISOString();
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

const domainCode = (error: unknown) =>
	(error as { cause?: { code?: string } }).cause?.code;

/** Ana ("ana") publishes "Capitais" and runs a group with Bruno in it. */
async function setup() {
	const api = createTestApi();
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
		["carla", "Carla"],
	] as const) {
		api.groups.addUser({ id, name, email: `${id}@exemplo.com` });
	}
	await api.quizzes.save(
		aPublishedQuiz({ id: "quiz-1", ownerId: "ana", title: "Capitais" }),
	);
	await api.versions.save(
		newQuizVersion({
			quizId: "quiz-1",
			number: 1,
			questions: somePlayableQuestions(),
			now: new Date("2026-02-01T10:00:00.000Z"),
		}),
	);
	const ana = api.callerFor("ana");
	const bruno = api.callerFor("bruno");
	const { groupId } = await ana.group.create({ name: "Turma 7A" });
	const { code } = await ana.group.invite.get({ groupId });
	await bruno.group.invite.accept({ code });
	return { api, ana, bruno, groupId };
}

describe("assignments in a group (spec 038)", () => {
	it("group.assign creates the assignment and the post", async () => {
		const { ana, bruno, groupId } = await setup();

		const { gameId } = await ana.group.assign({
			groupId,
			quizId: "quiz-1",
			deadline: inDays(3),
			options,
			message: "Revisem",
		});

		const { posts } = await bruno.group.feed({ groupId });
		expect(posts).toEqual([
			expect.objectContaining({
				author: { userId: "ana", name: "Ana" },
				message: "Revisem",
				attachment: expect.objectContaining({
					gameId,
					name: "Capitais",
					remainingMs: 3 * DAY_MS,
				}),
				canSeeReport: false,
				canDelete: false,
			}),
		]);
		const { items } = await bruno.group.assignments({
			groupId,
			sort: "recent",
		});
		expect(items.map((item) => item.gameId)).toEqual([gameId]);
	});

	it("refuses a 501-character message and a member without the switch", async () => {
		const { ana, bruno, groupId } = await setup();
		const assign = (caller: typeof ana, message?: string) =>
			caller.group
				.assign({
					groupId,
					quizId: "quiz-1",
					deadline: inDays(3),
					options,
					message,
				})
				.catch((error) => error);

		expect(domainCode(await assign(ana, "a".repeat(501)))).toBe(
			"GROUP.INVALID_MESSAGE",
		);
		expect(domainCode(await assign(bruno))).toBe("GROUP.ASSIGN_NOT_ALLOWED");
	});

	it("setLike and posts.delete", async () => {
		const { ana, bruno, groupId } = await setup();
		await ana.group.assign({
			groupId,
			quizId: "quiz-1",
			deadline: inDays(3),
			options,
		});
		const [post] = (await bruno.group.feed({ groupId })).posts;
		const postId = post?.id ?? "";

		expect(
			await bruno.group.posts.setLike({ groupId, postId, liked: true }),
		).toEqual({ liked: true, likeCount: 1 });
		const refused = await bruno.group.posts
			.delete({ groupId, postId })
			.catch((error) => error);
		expect(domainCode(refused)).toBe("GROUP.POST_DELETE_NOT_ALLOWED");
		await ana.group.posts.delete({ groupId, postId });
		expect((await ana.group.feed({ groupId })).posts).toEqual([]);
	});

	it("assignableGroups and assignToGroups", async () => {
		const { ana, groupId } = await setup();
		const { gameId } = await ana.game.assignment.create({
			quizId: "quiz-1",
			deadline: inDays(3),
			options,
		});

		expect(await ana.group.assignableGroups({ gameId })).toEqual({
			groups: [{ id: groupId, name: "Turma 7A", alreadyAssigned: false }],
		});
		expect(
			await ana.group.assignToGroups({ gameId, groupIds: [groupId] }),
		).toEqual({ assigned: 1 });
		const again = await ana.group
			.assignToGroups({ gameId, groupIds: [groupId] })
			.catch((error) => error);
		expect(domainCode(again)).toBe("GROUP.ALREADY_ASSIGNED");
	});
});

describe("a member's report read by the group's admin (spec 038, RN-20a)", () => {
	it("a granted admin reads a member's report read-only and cannot change it", async () => {
		const { api, ana, bruno, groupId } = await setup();
		await ana.group.settings.setPermission({
			groupId,
			permission: "membersCanAssign",
			value: true,
		});
		await api.quizzes.save(
			aPublishedQuiz({ id: "quiz-2", ownerId: "bruno", title: "Rios" }),
		);
		await api.versions.save(
			newQuizVersion({
				quizId: "quiz-2",
				number: 1,
				questions: somePlayableQuestions(),
				now: new Date("2026-02-01T10:00:00.000Z"),
			}),
		);
		const { gameId } = await bruno.group.assign({
			groupId,
			quizId: "quiz-2",
			deadline: inDays(3),
			options,
		});
		// The reports' fake does not read the games: put the report there.
		api.reports.put(
			aReportGame({
				header: { gameId, ownerId: "bruno", mode: "assignment" },
				questions: 1,
				players: ["Lia"],
				answers: { Lia: ["right"] },
			}),
		);

		const report = await ana.report.get({ gameId });
		expect(report.header.readOnly).toBe(true);
		const rename = await ana.report
			.rename({ gameId, name: "Meu" })
			.catch((error) => error);
		expect(rename).toMatchObject({ code: "NOT_FOUND" });
		const outsider = await api
			.callerFor("carla")
			.report.get({ gameId })
			.catch((error) => error);
		expect(outsider).toMatchObject({ code: "NOT_FOUND" });
	});
});
