import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

const fiveTypes = [
	{
		type: "quiz",
		text: "Quais foram reis da França?",
		choices: [
			{ text: "Luís XVI", correct: true },
			{ text: "Napoleão I", correct: false },
			{ text: "Luís XIV", correct: true },
			{ text: "Carlos Magno", correct: false },
		],
	},
	{ type: "trueFalse", text: "A Revolução começou em 1789", correct: true },
	{
		type: "typeAnswer",
		text: "Prisão tomada em 14 de julho",
		acceptedAnswers: ["Bastilha"],
	},
	{
		type: "slider",
		text: "Ano da execução de Luís XVI",
		slider: { min: 1780, max: 1800, answer: 1793 },
	},
	{
		type: "puzzle",
		text: "Ordene os eventos",
		items: ["Estados Gerais", "Queda da Bastilha", "Terror"],
	},
];

interface QuizResult {
	quiz: { id: string; status: string; questionCount: number };
	links: { editor: string; page: string };
}

describe("quiz tools (spec 044, RN-20, RN-22, RN-23)", () => {
	it("create_quiz with the five question types, then publish_quiz, gives a published quiz in order, all made with AI, the quota untouched and the editor and quiz links (CA-11)", async () => {
		const { api, ok } = await connectTestClient({ userId: "ana" });
		const quotaBefore = await api.container.useCases.getAssistantStatus({
			ownerId: "ana",
		});

		const created = (await ok("create_quiz", {
			title: "Revolução Francesa",
			questions: [
				...fiveTypes,
				...fiveTypes.map((question) => ({
					...question,
					text: `${question.text} (2)`,
				})),
			],
		})) as unknown as QuizResult;
		const published = (await ok("publish_quiz", {
			quizId: created.quiz.id,
		})) as unknown as QuizResult;
		const read = await ok("get_quiz", { quizId: created.quiz.id });

		expect(published.quiz).toMatchObject({ status: "published" });
		const questions = read.questions as {
			type: string;
			aiGenerated: boolean;
			issues: string[];
		}[];
		expect(questions.map((question) => question.type)).toEqual([
			"quiz",
			"trueFalse",
			"typeAnswer",
			"slider",
			"puzzle",
			"quiz",
			"trueFalse",
			"typeAnswer",
			"slider",
			"puzzle",
		]);
		expect(questions.every((question) => question.aiGenerated)).toBe(true);
		expect(questions.every((question) => question.issues.length === 0)).toBe(
			true,
		);
		expect(questions[0]).toMatchObject({ selection: "multiple" });
		expect(created.links).toEqual({
			editor: `https://quizio.test/creator/${created.quiz.id}`,
			page: `https://quizio.test/quizzes/${created.quiz.id}`,
		});
		expect(
			(await api.container.useCases.getAssistantStatus({ ownerId: "ana" }))
				.used,
		).toBe(quotaBefore.used);
	});

	it("publish_quiz with questions 2 and 5 incomplete lists both with their reasons (CA-12)", async () => {
		const { ok, call } = await connectTestClient({ userId: "ana" });
		const created = (await ok("create_quiz", {
			title: "Incompleto",
			questions: [
				fiveTypes[1],
				{ type: "trueFalse", correct: true },
				fiveTypes[1],
				fiveTypes[1],
				{
					type: "quiz",
					text: "Sem correta",
					choices: [
						{ text: "A", correct: false },
						{ text: "B", correct: false },
					],
				},
			],
		})) as unknown as QuizResult;

		const result = await call("publish_quiz", { quizId: created.quiz.id });

		expect(result.isError).toBe(true);
		expect(result.data.error).toMatchObject({
			code: "QUIZ.INCOMPLETE_QUESTIONS",
			details: {
				questions: [
					expect.objectContaining({ position: 2, issues: ["missingText"] }),
					expect.objectContaining({ position: 5, issues: ["noCorrectAnswer"] }),
				],
			},
		});
		const read = await ok("get_quiz", { quizId: created.quiz.id });
		expect(read.quiz).toMatchObject({ status: "draft" });
	});

	it("update_quiz changes only what is sent: details, visibility and theme", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });
		const created = (await ok("create_quiz", {
			title: "Antes",
			description: "Descrição",
		})) as unknown as QuizResult;

		const renamed = await ok("update_quiz", {
			quizId: created.quiz.id,
			title: "Depois",
		});
		const themed = await ok("update_quiz", {
			quizId: created.quiz.id,
			visibility: "public",
			theme: { readyMade: "teal" },
		});

		expect(renamed.quiz).toMatchObject({
			title: "Depois",
			description: "Descrição",
			visibility: "private",
		});
		expect(themed.quiz).toMatchObject({
			title: "Depois",
			visibility: "public",
			themeId: "teal",
		});
	});

	it("duplicate_quiz copies the caller's own and a public one", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
		const own = (await ana.ok("create_quiz", {
			title: "Meu",
		})) as unknown as QuizResult;
		const theirs = (await bruno.ok("create_quiz", {
			title: "Público",
			questions: [fiveTypes[1]],
		})) as unknown as QuizResult;
		await bruno.ok("publish_quiz", { quizId: theirs.quiz.id });
		await bruno.ok("update_quiz", {
			quizId: theirs.quiz.id,
			visibility: "public",
		});

		const copy = (await ana.ok("duplicate_quiz", {
			quizId: own.quiz.id,
		})) as unknown as QuizResult;
		const copyOfPublic = (await ana.ok("duplicate_quiz", {
			quizId: theirs.quiz.id,
		})) as unknown as QuizResult;

		expect(copy.quiz.id).not.toBe(own.quiz.id);
		expect(copyOfPublic.quiz).toMatchObject({ visibility: "private" });
	});

	it("set_quiz_trashed moves and restores; delete_quiz_permanently only from the trash", async () => {
		const { ok, call } = await connectTestClient({ userId: "ana" });
		const created = (await ok("create_quiz", {
			title: "Lixo",
		})) as unknown as QuizResult;

		const notInTrash = await call("delete_quiz_permanently", {
			quizId: created.quiz.id,
		});
		await ok("set_quiz_trashed", { quizId: created.quiz.id, trashed: true });
		const trash = await ok("list_quizzes", { section: "trash" });
		await ok("set_quiz_trashed", { quizId: created.quiz.id, trashed: false });
		await ok("set_quiz_trashed", { quizId: created.quiz.id, trashed: true });
		await ok("delete_quiz_permanently", { quizId: created.quiz.id });

		expect(notInTrash.isError).toBe(true);
		expect(trash.quizzes).toEqual([
			expect.objectContaining({ id: created.quiz.id }),
		]);
		expect((await ok("list_quizzes", { section: "trash" })).quizzes).toEqual(
			[],
		);
	});

	it("discard_quiz_changes brings back the playable version", async () => {
		const { ok } = await connectTestClient({ userId: "ana" });
		const created = (await ok("create_quiz", {
			title: "Versão",
			questions: [fiveTypes[1]],
		})) as unknown as QuizResult;
		await ok("publish_quiz", { quizId: created.quiz.id });
		await ok("add_questions", {
			quizId: created.quiz.id,
			questions: [fiveTypes[2]],
		});

		const discarded = await ok("discard_quiz_changes", {
			quizId: created.quiz.id,
		});

		expect(discarded.questions as unknown[]).toHaveLength(1);
	});

	it("someone else's quiz is not found for every tool (CA-15)", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
		const theirs = (await bruno.ok("create_quiz", {
			title: "Privado",
		})) as unknown as QuizResult;

		for (const [tool, args] of [
			["get_quiz", { quizId: theirs.quiz.id }],
			["update_quiz", { quizId: theirs.quiz.id, title: "Hackeado" }],
			["publish_quiz", { quizId: theirs.quiz.id }],
			["set_quiz_trashed", { quizId: theirs.quiz.id, trashed: true }],
			["delete_quiz_permanently", { quizId: theirs.quiz.id }],
			["duplicate_quiz", { quizId: theirs.quiz.id }],
		] as const) {
			const result = await ana.call(tool, args);
			expect(result.isError, tool).toBe(true);
			expect((result.data.error as { code: string }).code, tool).toBe(
				"QUIZ.NOT_FOUND",
			);
		}
	});
});
