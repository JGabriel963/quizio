import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

const complete = {
	title: "Sistema solar",
	questions: [
		{ type: "trueFalse", text: "A Terra é redonda", correct: true },
		{
			type: "quiz",
			text: "Maior planeta?",
			choices: [
				{ text: "Júpiter", correct: true },
				{ text: "Marte", correct: false },
			],
		},
	],
};

describe("library tools (spec 044, RN-19)", () => {
	it("list_quizzes lists a section with search, with links", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });
		const first = await ok("create_quiz", { title: "Revolução Francesa" });
		await ok("create_quiz", { title: "Química orgânica" });

		const found = await ok("list_quizzes", {
			section: "drafts",
			search: "revolucao",
		});

		expect(found.quizzes).toEqual([
			expect.objectContaining({
				title: "Revolução Francesa",
				links: {
					editor: `https://quizio.test/creator/${(first.quiz as { id: string }).id}`,
					page: `https://quizio.test/quizzes/${(first.quiz as { id: string }).id}`,
				},
			}),
		]);
	});

	it("get_creator_profile and get_others_quiz read a public quiz and a quiz shared in the caller's group", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
		const created = (await bruno.ok("create_quiz", complete)).quiz as {
			id: string;
		};
		await bruno.ok("publish_quiz", { quizId: created.id });
		await bruno.ok("update_quiz", { quizId: created.id, visibility: "public" });
		// The profile is a read model the test gives by hand, as the database reads it.
		const { questions } = await ana.api.container.useCases.getQuizEditor({
			ownerId: "bruno",
			quizId: created.id,
		});
		ana.api.creatorProfiles.addCreator({
			userId: "bruno",
			name: "Bruno",
			photoKey: null,
		});
		ana.api.creatorProfiles.addPublicQuiz("bruno", {
			quizId: created.id,
			title: "Sistema solar",
			coverImageKey: null,
			questionCount: 2,
			games: 0,
			participants: 0,
			description: "",
			questions,
			themeId: "standard",
		});

		const profile = await ana.ok("get_creator_profile", { userId: "bruno" });
		const publicQuiz = await ana.ok("get_others_quiz", {
			quizId: created.id,
			ownerId: "bruno",
		});

		expect(profile.quizzes).toEqual([
			expect.objectContaining({ quizId: created.id }),
		]);
		expect(publicQuiz).toMatchObject({
			quiz: { quizId: created.id, title: "Sistema solar" },
		});
		expect(
			(publicQuiz.quiz as { questions: unknown[] }).questions,
		).toHaveLength(2);

		const { groupId } = await ana.api.callerFor("bruno").group.create({
			name: "Ciências",
		});
		const { code } = await ana.api
			.callerFor("bruno")
			.group.invite.get({ groupId });
		await ana.api.callerFor("ana").group.invite.accept({ code });
		await bruno.ok("update_quiz", {
			quizId: created.id,
			visibility: "private",
		});
		await ana.api
			.callerFor("bruno")
			.group.share({ groupId, quizIds: [created.id] });

		const shared = await ana.ok("get_others_quiz", {
			quizId: created.id,
			groupId,
		});
		expect(shared).toMatchObject({ quiz: { quizId: created.id } });
	});

	it("get_others_quiz of a private quiz is not found", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
		const created = (await bruno.ok("create_quiz", complete)).quiz as {
			id: string;
		};
		await bruno.ok("publish_quiz", { quizId: created.id });

		const result = await ana.call("get_others_quiz", {
			quizId: created.id,
			ownerId: "bruno",
		});

		expect(result.isError).toBe(true);
		expect((result.data.error as { code: string }).code).toMatch(/NOT_FOUND$/);
	});
});
