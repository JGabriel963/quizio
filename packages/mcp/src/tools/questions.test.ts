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

describe("statement formatting (spec 047, RN-28 to RN-30)", () => {
	const formatted = "Qual é a fórmula da <b>água</b>, H<sub>2</sub>O?";

	it("add_questions keeps sub and bold, and get_quiz reads them back", async () => {
		const { ok, quizId, read } = await quizWith([tf("Um")]);

		const added = await ok("add_questions", {
			quizId,
			questions: [tf(formatted)],
		});

		expect((await read()).map((question) => question.text)).toEqual([
			"Um",
			formatted,
		]);
		expect(added.questions).toEqual([
			expect.objectContaining({ text: formatted }),
		]);
		expect((await read())[1]).not.toHaveProperty("textFormatting");
	});

	it("update_question without tags clears the formatting", async () => {
		const { ok, quizId, read } = await quizWith([tf(formatted)]);
		const [question] = await read();

		await ok("update_question", {
			quizId,
			questionId: question?.id,
			changes: { text: "Qual é a fórmula da água, H2O?" },
		});

		expect((await read())[0]?.text).toBe("Qual é a fórmula da água, H2O?");
	});

	it("160 characters with tags are accepted, 161 are refused", async () => {
		const { call, ok, quizId } = await quizWith([tf("Um")]);
		const half = "a".repeat(80);

		await ok("add_questions", {
			quizId,
			questions: [tf(`<b>${half}</b>${half}`)],
		});
		const tooLong = await call("add_questions", {
			quizId,
			questions: [tf(`<b>${half}</b>${half}a`)],
		});

		expect(tooLong.data.error).toMatchObject({
			code: "QUIZ.QUESTION_TEXT_TOO_LONG",
		});
	});

	it("subscript inside superscript is refused with QUIZ.INVALID_TEXT_FORMATTING", async () => {
		const { call, quizId } = await quizWith([tf("Um")]);

		const refused = await call("add_questions", {
			quizId,
			questions: [tf("x<sup><sub>2</sub></sup>")],
		});

		expect(refused.data.error).toMatchObject({
			code: "QUIZ.INVALID_TEXT_FORMATTING",
		});
	});

	it("an unknown tag is refused and x < 3 is text (CA-31)", async () => {
		const { call, ok, quizId, read } = await quizWith([tf("Um")]);

		const refused = await call("add_questions", {
			quizId,
			questions: [tf("Um <u>sublinhado</u>")],
		});
		await ok("add_questions", {
			quizId,
			questions: [tf("Para qual valor x < 3 e x > 1?")],
		});

		expect(refused.data.error).toMatchObject({ code: "INVALID_INPUT" });
		expect((await read()).map((question) => question.text)).toEqual([
			"Um",
			"Para qual valor x < 3 e x > 1?",
		]);
	});
});

describe("answer formatting (spec 048, RN-22 to RN-24)", () => {
	interface Answers {
		choices?: { text: string | null }[];
		items?: (string | null)[];
	}
	const water = {
		type: "quiz",
		text: "Fórmula da água?",
		choices: [
			{ text: "H<sub>2</sub>O", correct: true },
			{ text: "CO<sub>2</sub>", correct: false },
		],
	};
	const primates = {
		type: "puzzle",
		text: "Ordene",
		items: ["<i>Homo</i>", "Pan", "Gorilla"],
	};
	const answersOf = async (
		ok: (
			name: string,
			args?: Record<string, unknown>,
		) => Promise<Record<string, unknown>>,
		quizId: string,
	) => (await ok("get_quiz", { quizId })).questions as Answers[];

	it("add_questions keeps the answers' tags, and get_quiz reads them back", async () => {
		const { ok, quizId } = await quizWith([tf("Um")]);

		await ok("add_questions", { quizId, questions: [water, primates] });
		const questions = await answersOf(ok, quizId);

		expect(questions[1]?.choices?.map((choice) => choice.text)).toEqual([
			"H<sub>2</sub>O",
			"CO<sub>2</sub>",
			null,
			null,
		]);
		expect(questions[2]?.items).toEqual([
			"<i>Homo</i>",
			"Pan",
			"Gorilla",
			null,
		]);
		expect(JSON.stringify(questions)).not.toMatch(
			/textFormatting|itemFormatting/,
		);
	});

	it("update_question without tags clears an answer's formatting", async () => {
		const { ok, quizId, read } = await quizWith([water]);
		const [question] = await read();

		await ok("update_question", {
			quizId,
			questionId: question?.id,
			changes: {
				choices: [
					{ text: "H2O", correct: true },
					{ text: "CO2", correct: false },
				],
			},
		});

		expect((await answersOf(ok, quizId))[0]?.choices?.[0]?.text).toBe("H2O");
	});

	it("x < 3 is kept as an answer and an unknown tag is refused", async () => {
		const { call, ok, quizId } = await quizWith([tf("Um")]);

		await ok("add_questions", {
			quizId,
			questions: [
				{
					type: "quiz",
					text: "Qual?",
					choices: [
						{ text: "x < 3", correct: true },
						{ text: "x > 3", correct: false },
					],
				},
			],
		});
		const refused = await call("add_questions", {
			quizId,
			questions: [
				{
					type: "puzzle",
					text: "Ordene",
					items: ["<u>a</u>", "b", "c"],
				},
			],
		});

		expect((await answersOf(ok, quizId))[1]?.choices?.[0]?.text).toBe("x < 3");
		expect(refused.data.error).toMatchObject({ code: "INVALID_INPUT" });
	});

	it("75 characters with tags are accepted, 76 are refused", async () => {
		const { call, ok, quizId } = await quizWith([tf("Um")]);
		const answer = (extra: string) => ({
			type: "quiz",
			text: "Qual?",
			choices: [
				{
					text: `<b>${"a".repeat(37)}</b>${"a".repeat(38)}${extra}`,
					correct: true,
				},
				{ text: "b", correct: false },
			],
		});

		await ok("add_questions", { quizId, questions: [answer("")] });
		const tooLong = await call("add_questions", {
			quizId,
			questions: [answer("a")],
		});

		expect(tooLong.data.error).toMatchObject({
			code: "QUIZ.CHOICE_TEXT_TOO_LONG",
		});
	});
});

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
