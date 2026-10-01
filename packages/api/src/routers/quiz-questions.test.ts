import { asQuiz } from "@quizio/core/quiz/testing/a-question";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const failureOf = (promise: Promise<unknown>) =>
	promise.then(
		() => {
			throw new Error("Expected the call to fail");
		},
		(error: unknown) => error,
	);

describe("quiz.questions router", () => {
	it("add, duplicate, move and delete round-trip through quiz.editor", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const {
			questions: [first],
		} = await ana.quiz.editor({ quizId });
		const firstId = first?.id ?? "";

		await ana.quiz.questions.update({
			quizId,
			questionId: firstId,
			change: { kind: "text", text: "Capital?" },
		});
		const added = await ana.quiz.questions.add({
			quizId,
			afterQuestionId: firstId,
			type: "quiz",
		});
		const copy = await ana.quiz.questions.duplicate({
			quizId,
			questionId: firstId,
		});
		await ana.quiz.questions.move({
			quizId,
			questionId: added.question.id,
			toIndex: 0,
		});
		const beforeDelete = await ana.quiz.editor({ quizId });
		await ana.quiz.questions.delete({
			quizId,
			questionId: copy.question.id,
		});
		const afterDelete = await ana.quiz.editor({ quizId });

		expect(added.index).toBe(1);
		expect(copy).toEqual({
			question: { ...first, id: expect.any(String), text: "Capital?" },
			index: 1,
		});
		expect(beforeDelete.questions.map(({ id }) => id)).toEqual([
			added.question.id,
			firstId,
			copy.question.id,
		]);
		expect(beforeDelete.quiz.questionCount).toBe(3);
		expect(afterDelete.questions.map(({ id }) => id)).toEqual([
			added.question.id,
			firstId,
		]);
		expect(afterDelete.quiz.questionCount).toBe(2);
	});

	it("update saves answers, corrects, time and points and returns the notice", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });
		const ref = { quizId, questionId: questions[0]?.id ?? "" };

		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-1", text: "Brasília" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-2", text: "Rio" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-1", correct: true },
		});
		const second = await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-2", correct: true },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "timeLimit", seconds: 90 },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "points", points: "double" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "extraChoices", visible: true },
		});
		const { questions: after } = await ana.quiz.editor({ quizId });

		expect(second.notice).toEqual({ kind: "multipleEnabled" });
		expect(after[0]).toMatchObject({
			selection: "multiple",
			timeLimitSeconds: 90,
			points: "double",
		});
		const { choices } = asQuiz(after[0]);
		expect(choices).toHaveLength(6);
		expect(choices.slice(0, 2)).toEqual([
			{ id: "choice-1", text: "Brasília", correct: true },
			{ id: "choice-2", text: "Rio", correct: true },
		]);
	});

	it("adds a true/false question, marks its answer and applies time to every type", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const added = await ana.quiz.questions.add({
			quizId,
			afterQuestionId: questions[0]?.id ?? "",
			type: "trueFalse",
		});
		await ana.quiz.questions.update({
			quizId,
			questionId: added.question.id,
			change: { kind: "trueFalseCorrect", correct: false },
		});
		await ana.quiz.questions.applyTimeLimitToAll({ quizId, seconds: 10 });
		const after = await ana.quiz.editor({ quizId });

		expect(added).toEqual({
			question: {
				id: expect.any(String),
				type: "trueFalse",
				text: null,
				timeLimitSeconds: 20,
				points: "standard",
				image: null,
				correct: null,
			},
			index: 1,
		});
		expect(after.questions[1]).toEqual({
			...added.question,
			timeLimitSeconds: 10,
			correct: false,
		});
		expect(after.questions[0]?.type).toBe("quiz");
	});

	it("changes the type and back with the remembered answers", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });
		const ref = { quizId, questionId: questions[0]?.id ?? "" };
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-1", text: "Sim" },
		});
		const { question: written } = await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-1", correct: true },
		});

		const toTrueFalse = await ana.quiz.questions.update({
			...ref,
			change: { kind: "type", type: "trueFalse", remembered: null },
		});
		const back = await ana.quiz.questions.update({
			...ref,
			change: { kind: "type", type: "quiz", remembered: asQuiz(written) },
		});
		const after = await ana.quiz.editor({ quizId });

		expect(toTrueFalse).toEqual({
			question: {
				id: ref.questionId,
				type: "trueFalse",
				text: null,
				timeLimitSeconds: 20,
				points: "standard",
				image: null,
				correct: null,
			},
			notice: { kind: "quizAnswersKept" },
		});
		expect(back).toEqual({ question: written, notice: null });
		expect(after.questions).toEqual([written]);
	});

	it("refuses an unknown type at the boundary", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const changed = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId: questions[0]?.id ?? "",
				change: { kind: "type", type: "slider" as never, remembered: null },
			}),
		);
		const added = await failureOf(
			ana.quiz.questions.add({
				quizId,
				afterQuestionId: null,
				type: "slider" as never,
			}),
		);

		expect(changed).toMatchObject({ code: "BAD_REQUEST" });
		expect(added).toMatchObject({ code: "BAD_REQUEST" });
		expect((await ana.quiz.editor({ quizId })).questions).toEqual(questions);
	});

	it("a change of another type is BAD_REQUEST with its domainCode", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId: questions[0]?.id ?? "",
				change: { kind: "trueFalseCorrect", correct: true },
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.CHANGE_NOT_APPLICABLE" },
		});
	});

	it("update refuses an answer over 75 characters with its domainCode", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId: questions[0]?.id ?? "",
				change: {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(76),
				},
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.CHOICE_TEXT_TOO_LONG" },
		});
	});

	describe("question image (spec 007)", () => {
		async function quizWithUpload() {
			const api = createTestApi();
			const ana = api.callerFor("user-1");
			const { id: quizId } = await ana.quiz.create({});
			const { questions } = await ana.quiz.editor({ quizId });
			const upload = await ana.media.requestUpload({
				contentType: "image/png",
				sizeBytes: 2048,
			});
			api.storage.simulateUpload(upload.key);
			const update = (
				change: Parameters<typeof ana.quiz.questions.update>[0]["change"],
			) =>
				ana.quiz.questions.update({
					quizId,
					questionId: questions[0]?.id ?? "",
					change,
				});
			return { api, ana, quizId, upload, update };
		}

		it("sets, adjusts and removes a question image", async () => {
			const { api, ana, quizId, upload, update } = await quizWithUpload();

			await update({ kind: "image", key: upload.key });
			await update({ kind: "imagePlacement", placement: "background" });
			await update({
				kind: "imageCrop",
				crop: { shape: "circle", zoom: 1.5, x: 0, y: 1 },
			});
			await update({ kind: "imageAltText", altText: " Ponte " });
			const withImage = await ana.quiz.editor({ quizId });
			const { question: removed } = await update({ kind: "image", key: null });

			expect(withImage.questions[0]?.image).toEqual({
				key: upload.key,
				placement: "background",
				crop: { shape: "circle", zoom: 1.5, x: 0, y: 1 },
				altText: "Ponte",
			});
			expect(withImage.imageUrls).toEqual({ [upload.key]: upload.publicUrl });
			expect(removed.image).toBeNull();
			expect(api.storage.keys()).toEqual([]);
		});

		it("refuses someone else's upload with its domainCode", async () => {
			const { api, update } = await quizWithUpload();
			api.storage.simulateUpload("media/user-2/segredo.png");

			const error = await failureOf(
				update({ kind: "image", key: "media/user-2/segredo.png" }),
			);

			expect(error).toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "QUIZ.INVALID_IMAGE" },
			});
		});

		it("refuses a crop out of range and an adjustment without image", async () => {
			const { upload, update } = await quizWithUpload();

			const noImage = await failureOf(
				update({ kind: "imageAltText", altText: "Ponte" }),
			);
			await update({ kind: "image", key: upload.key });
			const badCrop = await failureOf(
				update({
					kind: "imageCrop",
					crop: { shape: "square", zoom: 9, x: 0.5, y: 0.5 },
				}),
			);

			expect(noImage).toMatchObject({ cause: { code: "QUIZ.NO_IMAGE" } });
			expect(badCrop).toMatchObject({
				cause: { code: "QUIZ.INVALID_IMAGE_CROP" },
			});
		});
	});

	it("applyTimeLimitToAll sets every question's time and returns the count", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		await ana.quiz.questions.add({
			quizId,
			afterQuestionId: null,
			type: "quiz",
		});
		await ana.quiz.questions.add({
			quizId,
			afterQuestionId: null,
			type: "quiz",
		});

		const result = await ana.quiz.questions.applyTimeLimitToAll({
			quizId,
			seconds: 45,
		});
		const { questions } = await ana.quiz.editor({ quizId });

		expect(result).toEqual({ updatedCount: 3 });
		expect(questions.map((question) => question.timeLimitSeconds)).toEqual([
			45, 45, 45,
		]);
	});

	it("applyTimeLimitToAll refuses a time outside the list", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});

		const error = await failureOf(
			ana.quiz.questions.applyTimeLimitToAll({ quizId, seconds: 25 }),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.INVALID_TIME_LIMIT" },
		});
	});

	it("delete of the only question is BAD_REQUEST with domainCode QUIZ.LAST_QUESTION", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const error = await failureOf(
			ana.quiz.questions.delete({
				quizId,
				questionId: questions[0]?.id ?? "",
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.LAST_QUESTION" },
		});
	});

	it("update refuses visitors", async () => {
		const error = await failureOf(
			createTestApi()
				.callerFor(null)
				.quiz.questions.update({
					quizId: "quiz-1",
					questionId: "question-1",
					change: { kind: "text", text: "X" },
				}),
		);

		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("operations on another owner's quiz are NOT_FOUND", async () => {
		const api = createTestApi();
		const { id: quizId } = await api.callerFor("user-1").quiz.create({});

		const error = await failureOf(
			api
				.callerFor("user-2")
				.quiz.questions.add({ quizId, afterQuestionId: null, type: "quiz" }),
		);

		expect(error).toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "QUIZ.NOT_FOUND" },
		});
	});

	it("rejects a negative position at the boundary", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});

		const error = await failureOf(
			ana.quiz.questions.move({ quizId, questionId: "x", toIndex: -1 }),
		);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
	});
});
