import { somePlayableQuestions } from "@quizio/core/game/testing/game-deps";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const domainCode = (error: unknown) =>
	(error as { cause?: { code?: string } }).cause?.code;

/** Ana's group with Bruno and Carla; Ana has two saved quizzes. */
async function setup() {
	const api = createTestApi();
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
		["carla", "Carla"],
		["diego", "Diego"],
	] as const) {
		api.groups.addUser({ id, name, email: `${id}@exemplo.com` });
	}
	for (const [id, title] of [
		["capitais", "Capitais"],
		["rios", "Rios"],
	] as const) {
		await api.quizzes.save(aPublishedQuiz({ id, ownerId: "ana", title }));
		await api.versions.save(
			newQuizVersion({
				quizId: id,
				number: 1,
				questions: somePlayableQuestions(),
				now: new Date("2026-02-01T10:00:00.000Z"),
			}),
		);
	}
	const ana = api.callerFor("ana");
	const bruno = api.callerFor("bruno");
	const carla = api.callerFor("carla");
	const diego = api.callerFor("diego");
	const { groupId } = await ana.group.create({ name: "Turma 7A" });
	const { code } = await ana.group.invite.get({ groupId });
	await bruno.group.invite.accept({ code });
	await carla.group.invite.accept({ code });
	return { api, ana, bruno, carla, diego, groupId };
}

describe("group.share and the shared tab (spec 037)", () => {
	it("group.share shares one or several and the feed shows the post", async () => {
		const { ana, carla, groupId } = await setup();

		await ana.group.share({ groupId, quizIds: ["capitais"], message: "Oi" });
		await ana.group.share({ groupId, quizIds: ["rios"] });

		const { posts } = await carla.group.feed({ groupId });
		expect(posts.map((post) => post.headline)).toEqual(["quiz", "quiz"]);
		expect(posts[1]).toMatchObject({
			message: "Oi",
			quiz: {
				quizId: "capitais",
				title: "Capitais",
				questionCount: 2,
				owner: { userId: "ana", name: "Ana" },
				canUnshare: false,
			},
		});
		expect((await carla.group.shared.ids({ groupId })).sort()).toEqual([
			"capitais",
			"rios",
		]);
	});

	it("group.share refuses a member without the switch", async () => {
		const { api, ana, bruno, groupId } = await setup();
		await api.quizzes.save(
			aPublishedQuiz({ id: "mapas", ownerId: "bruno", title: "Mapas" }),
		);
		await ana.group.settings.setPermission({
			groupId,
			permission: "membersCanShare",
			value: false,
		});

		const refused = await bruno.group
			.share({ groupId, quizIds: ["mapas"] })
			.catch((error: unknown) => error);

		expect(domainCode(refused)).toBe("GROUP.SHARE_NOT_ALLOWED");
		expect((await bruno.group.get({ groupId })).abilities.share).toBe(false);
	});

	it("group.unshare by the sharer and the admin only", async () => {
		const { ana, carla, groupId } = await setup();
		await ana.group.share({ groupId, quizIds: ["capitais"] });

		const refused = await carla.group
			.unshare({ groupId, quizId: "capitais" })
			.catch((error: unknown) => error);
		expect(domainCode(refused)).toBe("GROUP.UNSHARE_NOT_ALLOWED");

		await ana.group.unshare({ groupId, quizId: "capitais" });
		const { posts } = await carla.group.feed({ groupId });
		expect(posts[0]).toMatchObject({ headline: "file", quiz: null });
	});

	it("group.shared.list sorts and pages; group.shared.get for members only", async () => {
		const { api, ana, carla, diego, groupId } = await setup();
		await ana.group.share({ groupId, quizIds: ["rios"] });
		api.clock.advanceBy(60_000);
		await ana.group.share({ groupId, quizIds: ["capitais"] });

		const recent = await carla.group.shared.list({ groupId, sort: "recent" });
		expect(recent.items.map((item) => item.title)).toEqual([
			"Capitais",
			"Rios",
		]);
		const named = await carla.group.shared.list({
			groupId,
			sort: "nameDesc",
			limit: 1,
		});
		expect(named).toMatchObject({ items: [{ title: "Rios" }], hasMore: true });

		const page = await carla.group.shared.get({ groupId, quizId: "capitais" });
		expect(page).toMatchObject({
			title: "Capitais",
			owner: { userId: "ana", name: "Ana" },
			ownedByViewer: false,
		});
		expect(page.questions).toHaveLength(2);

		const outsider = await diego.group.shared
			.get({ groupId, quizId: "capitais" })
			.catch((error: unknown) => error);
		expect(domainCode(outsider)).toBe("GROUP.NOT_FOUND");
		const missing = await carla.group.shared
			.get({ groupId, quizId: "mapas" })
			.catch((error: unknown) => error);
		expect(domainCode(missing)).toBe("GROUP.SHARED_QUIZ_NOT_FOUND");
	});

	it("quiz.duplicateShared copies for a member of the group", async () => {
		const { api, ana, carla, diego, groupId } = await setup();
		await ana.group.share({ groupId, quizIds: ["capitais"] });

		const copy = await carla.quiz.duplicateShared({ quizId: "capitais" });

		expect(copy).toMatchObject({ title: "Capitais (cópia)", status: "draft" });
		expect(await api.quizzes.findById(copy.id)).toMatchObject({
			ownerId: "carla",
		});
		const refused = await diego.quiz
			.duplicateShared({ quizId: "capitais" })
			.catch((error: unknown) => error);
		expect(domainCode(refused)).toBe("QUIZ.NOT_FOUND");
	});

	it("game.host and game.assignment.create accept a shared quiz", async () => {
		const { ana, carla, groupId } = await setup();
		await ana.group.share({ groupId, quizIds: ["capitais"] });

		const { gameId } = await carla.game.host({ quizId: "capitais" });
		const assignment = await carla.game.assignment.create({
			quizId: "capitais",
			deadline: "2026-06-03T12:00:00.000Z",
			options: {
				gameCharacters: true,
				questionTimer: true,
				randomizeAnswers: false,
			},
		});

		expect(gameId).toBeTruthy();
		expect(assignment.gameId).toBeTruthy();
		const refused = await carla.game
			.host({ quizId: "rios" })
			.catch((error: unknown) => error);
		expect(domainCode(refused)).toBe("GAME.QUIZ_NOT_FOUND");
	});
});
