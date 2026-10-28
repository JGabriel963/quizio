import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

interface Question {
	id: string;
	text: string | null;
	timeLimitSeconds: number;
	aiGenerated: boolean;
	issues: string[];
	position: number;
}

async function quizWith(questions: unknown[]) {
	const client = await connectTestClient({ userId: "ana" });
	const created = await client.ok("create_quiz", { title: "Quiz", questions });
	const quizId = (created.quiz as { id: string }).id;
	const read = async () =>
		(await client.ok("get_quiz", { quizId })).questions as Question[];
	return { ...client, quizId, read };
}

const tf = (text: string) => ({ type: "trueFalse", text, correct: true });

describe("question tools (spec 044, RN-21, RN-22)", () => {
	it("add_questions inserts after a question and returns what each one is missing", async () => {
		const { ok, quizId, read } = await quizWith([tf("Um"), tf("Três")]);
		const [first] = await read();

		const added = await ok("add_questions", {
			quizId,
			afterQuestionId: first?.id,
			questions: [
				tf("Dois"),
				{ type: "quiz", choices: [{ text: "Sozinha", correct: false }] },
			],
		});

		expect((await read()).map((question) => question.text)).toEqual([
			"Um",
			"Dois",
			null,
			"Três",
		]);
		expect(added.questions).toEqual([
			expect.objectContaining({ position: 2, issues: [] }),
			expect.objectContaining({
				position: 3,
				issues: ["missingText", "notEnoughAnswers", "noCorrectAnswer"],
			}),
		]);
	});

	it("add_questions refuses a 161-character statement and the 201st question (CA-13)", async () => {
		const { call, quizId, read } = await quizWith([tf("Um")]);

		const tooLong = await call("add_questions", {
			quizId,
			questions: [tf("a".repeat(161))],
		});
		const tooMany = await call("add_questions", {
			quizId,
			questions: Array.from({ length: 200 }, (_, index) => tf(`P${index}`)),
		});

		expect(tooLong.data.error).toMatchObject({
			code: "QUIZ.QUESTION_TEXT_TOO_LONG",
		});
		expect(tooMany.data.error).toMatchObject({
			code: "QUIZ.QUESTION_LIMIT_REACHED",
		});
		expect(await read()).toHaveLength(1);
	});

	it("update_question changes the statement and time and keeps the AI mark; duplicate_question copies the mark (CA-14)", async () => {
		const { ok, quizId, read } = await quizWith([tf("Antes")]);
		const [question] = await read();

		const updated = await ok("update_question", {
			quizId,
			questionId: question?.id,
			changes: { text: "Depois", timeLimitSeconds: 30 },
		});
		await ok("duplicate_question", { quizId, questionId: question?.id });

		expect(updated.question).toMatchObject({
			text: "Depois",
			timeLimitSeconds: 30,
			aiGenerated: true,
		});
		const [, copy] = await read();
		expect(copy).toMatchObject({ text: "Depois", aiGenerated: true });
	});

	it("an update_question from the agent and an editor change to another field both stay (CA-29)", async () => {
		const { api, ok, quizId, read } = await quizWith([tf("Antes")]);
		const [question] = await read();

		await ok("update_question", {
			quizId,
			questionId: question?.id,
			changes: { timeLimitSeconds: 60 },
		});
		await api.callerFor("ana").quiz.questions.update({
			quizId,
			questionId: question?.id ?? "",
			change: { kind: "text", text: "Do editor" },
		});

		expect((await read())[0]).toMatchObject({
			text: "Do editor",
			timeLimitSeconds: 60,
		});
	});

	it("move_question, delete_question (never the last) and set_time_limit_for_all", async () => {
		const { ok, call, quizId, read } = await quizWith([tf("A"), tf("B")]);
		const [a] = await read();

		await ok("move_question", { quizId, questionId: a?.id, toPosition: 2 });
		expect((await read()).map((question) => question.text)).toEqual(["B", "A"]);

		await ok("set_time_limit_for_all", { quizId, seconds: 45 });
		expect((await read()).map((question) => question.timeLimitSeconds)).toEqual(
			[45, 45],
		);

		await ok("delete_question", { quizId, questionId: a?.id });
		const [last] = await read();
		const refused = await call("delete_question", {
			quizId,
			questionId: last?.id,
		});
		expect(refused.data.error).toMatchObject({ code: "QUIZ.LAST_QUESTION" });
	});
});
