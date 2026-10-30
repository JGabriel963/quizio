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
			{
				id: "choice-1",
				text: "Brasília",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				text: "Rio",
				textFormatting: {},
				image: null,
				correct: true,
			},
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
				textFormatting: {},
				timeLimitSeconds: 20,
				points: "standard",
				image: null,
				aiGenerated: false,
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
			// The core's formatting is readonly; the editor casts it the same way.
			change: {
				kind: "type",
				type: "quiz",
				remembered: asQuiz(written) as never,
			},
		});
		const after = await ana.quiz.editor({ quizId });

		expect(toTrueFalse).toEqual({
			question: {
				id: ref.questionId,
				type: "trueFalse",
				text: null,
				textFormatting: {},
				timeLimitSeconds: 20,
				points: "standard",
				image: null,
				aiGenerated: false,
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
				change: { kind: "type", type: "poll" as never, remembered: null },
			}),
		);
		const added = await failureOf(
			ana.quiz.questions.add({
				quizId,
				afterQuestionId: null,
				type: "poll" as never,
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

	describe("statement formatting (spec 047)", () => {
		async function aQuizWithQuestion() {
			const ana = createTestApi().callerFor("user-1");
			const { id: quizId } = await ana.quiz.create({});
			const { questions } = await ana.quiz.editor({ quizId });
			return { ana, quizId, questionId: questions[0]?.id ?? "" };
		}

		it("update saves a text change with its formatting", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "text",
					text: "Quanto é 22?",
					formatting: { superscript: [[10, 11]] },
				},
			});

			expect(question).toMatchObject({
				text: "Quanto é 22?",
				textFormatting: { superscript: [[10, 11]] },
			});
			expect(
				(await ana.quiz.editor({ quizId })).questions[0]?.textFormatting,
			).toEqual({ superscript: [[10, 11]] });
		});

		it("a text change without formatting clears it", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();
			await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "text",
					text: "H2O",
					formatting: { subscript: [[1, 2]] },
				},
			});

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "text", text: "H2O" },
			});

			expect(question.textFormatting).toEqual({});
		});

		it("an invalid formatting is BAD_REQUEST with QUIZ.INVALID_TEXT_FORMATTING", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const error = await failureOf(
				ana.quiz.questions.update({
					quizId,
					questionId,
					change: {
						kind: "text",
						text: "H2O",
						formatting: { subscript: [[1, 2]], superscript: [[1, 2]] },
					},
				}),
			);

			expect(error).toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "QUIZ.INVALID_TEXT_FORMATTING" },
			});
		});

		it("refuses an unknown mark key by its shape", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const error = await failureOf(
				ana.quiz.questions.update({
					quizId,
					questionId,
					change: {
						kind: "text",
						text: "H2O",
						formatting: { underline: [[0, 1]] } as never,
					},
				}),
			);

			expect(error).toMatchObject({ code: "BAD_REQUEST" });
		});
	});

	describe("answer formatting (spec 048)", () => {
		async function aQuizWithQuestion() {
			const ana = createTestApi().callerFor("user-1");
			const { id: quizId } = await ana.quiz.create({});
			const { questions } = await ana.quiz.editor({ quizId });
			return { ana, quizId, questionId: questions[0]?.id ?? "" };
		}

		it("choiceText takes a formatting", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "H2O",
					formatting: { subscript: [[1, 2]] },
				},
			});

			expect(question.type === "quiz" && question.choices[0]).toMatchObject({
				text: "H2O",
				textFormatting: { subscript: [[1, 2]] },
			});
		});

		it("puzzleItemText takes a formatting", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();
			await ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "type", type: "puzzle", remembered: null },
			});

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "puzzleItemText",
					index: 1,
					text: "CO2",
					formatting: { subscript: [[2, 3]] },
				},
			});

			expect(question.type === "puzzle" && question.itemFormatting).toEqual([
				{},
				{ subscript: [[2, 3]] },
				{},
				{},
			]);
		});

		it("an answer change without formatting leaves none", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();
			await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "H2O",
					formatting: { subscript: [[1, 2]] },
				},
			});

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "choiceText", choiceId: "choice-1", text: "H2O" },
			});

			expect(
				question.type === "quiz" && question.choices[0]?.textFormatting,
			).toEqual({});
		});

		it("a type change keeps the remembered answers' formatting", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const { question } = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "type",
					type: "puzzle",
					remembered: {
						type: "puzzle",
						items: ["H2O", "Sal", "Ar", null],
						itemFormatting: [{ subscript: [[1, 2]] }, {}, {}, {}],
					},
				},
			});
			const back = await ana.quiz.questions.update({
				quizId,
				questionId,
				change: {
					kind: "type",
					type: "quiz",
					remembered: {
						type: "quiz",
						selection: "single",
						choices: [
							{
								text: "x2",
								textFormatting: { superscript: [[1, 2]] },
								correct: true,
							},
							{ text: "y", correct: false },
							{ text: null, correct: false },
							{ text: null, correct: false },
						],
					},
				},
			});

			expect(question.type === "puzzle" && question.itemFormatting[0]).toEqual({
				subscript: [[1, 2]],
			});
			expect(
				back.question.type === "quiz" &&
					back.question.choices[0]?.textFormatting,
			).toEqual({ superscript: [[1, 2]] });
		});

		it("an answer's bad formatting is INVALID_TEXT_FORMATTING", async () => {
			const { ana, quizId, questionId } = await aQuizWithQuestion();

			const error = await failureOf(
				ana.quiz.questions.update({
					quizId,
					questionId,
					change: {
						kind: "choiceText",
						choiceId: "choice-1",
						text: "H2O",
						formatting: { bold: [[0, 9]] },
					},
				}),
			);

			expect(error).toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "QUIZ.INVALID_TEXT_FORMATTING" },
			});
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

	describe("answer images (spec 049)", () => {
		const first = { choiceId: "choice-1" };

		async function quizWithUpload() {
			const setup = await (async () => {
				const api = createTestApi();
				const ana = api.callerFor("user-1");
				const { id: quizId } = await ana.quiz.create({});
				const { questions } = await ana.quiz.editor({ quizId });
				const upload = await ana.media.requestUpload({
					contentType: "image/png",
					sizeBytes: 2048,
				});
				api.storage.simulateUpload(upload.key);
				const questionId = questions[0]?.id ?? "";
				const update = (
					change: Parameters<typeof ana.quiz.questions.update>[0]["change"],
					id = questionId,
				) => ana.quiz.questions.update({ quizId, questionId: id, change });
				return { api, ana, quizId, upload, update, questionId };
			})();
			await setup.update({
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Arroz",
			});
			return setup;
		}

		it("answerImage puts an uploaded image in a quiz answer and a puzzle slot", async () => {
			const { ana, quizId, upload, update, questionId } =
				await quizWithUpload();

			const { question } = await update({
				kind: "answerImage",
				answer: first,
				key: upload.key,
			});
			const puzzle = await ana.quiz.questions.add({
				quizId,
				afterQuestionId: questionId,
				type: "puzzle",
			});
			await update(
				{ kind: "answerImage", answer: { slot: 2 }, key: upload.key },
				puzzle.question.id,
			);
			const editor = await ana.quiz.editor({ quizId });

			expect(question.type === "quiz" && question.choices[0]).toMatchObject({
				text: null,
				image: { key: upload.key, crop: null },
			});
			expect(editor.questions[1]).toMatchObject({
				itemImages: [null, null, { key: upload.key }, null],
			});
			expect(editor.imageUrls).toEqual({ [upload.key]: upload.publicUrl });
		});

		it("answerImageCrop and answerImageAltText", async () => {
			const { upload, update } = await quizWithUpload();
			await update({ kind: "answerImage", answer: first, key: upload.key });

			await update({
				kind: "answerImageCrop",
				answer: first,
				crop: { shape: "portrait", zoom: 2, x: 0.5, y: 0 },
			});
			const { question } = await update({
				kind: "answerImageAltText",
				answer: first,
				altText: " Arroz ",
			});

			expect(question.type === "quiz" && question.choices[0]?.image).toEqual({
				key: upload.key,
				crop: { shape: "portrait", zoom: 2, x: 0.5, y: 0 },
				altText: "Arroz",
			});
		});

		it("a circle crop and a foreign key are refused", async () => {
			const { api, upload, update } = await quizWithUpload();
			api.storage.simulateUpload("media/user-2/segredo.png");

			const foreign = await failureOf(
				update({
					kind: "answerImage",
					answer: first,
					key: "media/user-2/segredo.png",
				}),
			);
			await update({ kind: "answerImage", answer: first, key: upload.key });
			const circle = await failureOf(
				update({
					kind: "answerImageCrop",
					answer: first,
					crop: { shape: "circle", zoom: 1, x: 0.5, y: 0.5 },
				}),
			);

			expect(foreign).toMatchObject({ cause: { code: "QUIZ.INVALID_IMAGE" } });
			expect(circle).toMatchObject({
				cause: { code: "QUIZ.INVALID_IMAGE_CROP" },
			});
		});

		it("a text change on an image answer is ANSWER_HAS_IMAGE", async () => {
			const { upload, update } = await quizWithUpload();
			await update({ kind: "answerImage", answer: first, key: upload.key });

			const error = await failureOf(
				update({ kind: "choiceText", choiceId: "choice-1", text: "Arroz" }),
			);

			expect(error).toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "QUIZ.ANSWER_HAS_IMAGE" },
			});
		});

		it("a type change keeps the remembered images, and refuses a foreign one", async () => {
			const { api, upload, update } = await quizWithUpload();
			const { question } = await update({
				kind: "answerImage",
				answer: first,
				key: upload.key,
			});
			await update({ kind: "type", type: "trueFalse", remembered: null });
			const remembered = {
				type: "quiz" as const,
				selection: "single" as const,
				choices: (question.type === "quiz" ? question.choices : []).map(
					({ text, image, correct }) => ({ text, image, correct }),
				),
			};

			const { question: back } = await update({
				kind: "type",
				type: "quiz",
				remembered,
			});
			api.storage.simulateUpload("media/user-2/segredo.png");
			await update({ kind: "type", type: "trueFalse", remembered: null });
			const stolen = await failureOf(
				update({
					kind: "type",
					type: "quiz",
					remembered: {
						...remembered,
						choices: remembered.choices.map((choice, index) =>
							index === 0
								? {
										...choice,
										image: {
											key: "media/user-2/segredo.png",
											crop: null,
											altText: null,
										},
									}
								: choice,
						),
					},
				}),
			);

			expect(back.type === "quiz" && back.choices[0]).toMatchObject({
				text: null,
				image: { key: upload.key },
			});
			expect(stolen).toMatchObject({ cause: { code: "QUIZ.INVALID_IMAGE" } });
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

	describe("type answer (spec 031)", () => {
		async function withTypeAnswer() {
			const ana = createTestApi().callerFor("user-1");
			const { id: quizId } = await ana.quiz.create({});
			const {
				questions: [first],
			} = await ana.quiz.editor({ quizId });
			const added = await ana.quiz.questions.add({
				quizId,
				afterQuestionId: first?.id ?? null,
				type: "typeAnswer",
			});
			return { ana, quizId, questionId: added.question.id };
		}

		it("adds a type answer", async () => {
			const { ana, quizId } = await withTypeAnswer();

			const { questions } = await ana.quiz.editor({ quizId });

			expect(questions[1]).toMatchObject({
				type: "typeAnswer",
				timeLimitSeconds: 30,
				acceptedAnswers: [null],
			});
		});

		it("updates an accepted answer and adds another", async () => {
			const { ana, quizId, questionId } = await withTypeAnswer();

			await ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "acceptedAnswerText", index: 0, text: "Pedro" },
			});
			await ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "acceptedAnswerAdded" },
			});

			const { questions } = await ana.quiz.editor({ quizId });
			expect(questions[1]).toMatchObject({ acceptedAnswers: ["Pedro", null] });
		});

		it("refuses a long accepted answer with its domain code", async () => {
			const { ana, quizId, questionId } = await withTypeAnswer();

			const error = await failureOf(
				ana.quiz.questions.update({
					quizId,
					questionId,
					change: {
						kind: "acceptedAnswerText",
						index: 0,
						text: "a".repeat(21),
					},
				}),
			);

			expect(error).toMatchObject({
				code: "BAD_REQUEST",
				cause: { code: "QUIZ.ACCEPTED_ANSWER_TOO_LONG" },
			});
		});

		it("changes a question to type answer with remembered content", async () => {
			const { ana, quizId } = await withTypeAnswer();
			const { questions } = await ana.quiz.editor({ quizId });

			const result = await ana.quiz.questions.update({
				quizId,
				questionId: questions[0]?.id ?? "",
				change: {
					kind: "type",
					type: "typeAnswer",
					remembered: {
						type: "typeAnswer",
						acceptedAnswers: ["Pedro", "Simão"],
					},
				},
			});

			expect(result.question).toMatchObject({
				type: "typeAnswer",
				acceptedAnswers: ["Pedro", "Simão"],
				timeLimitSeconds: 20,
			});
		});

		it("applying 10 s to all gives type answers 20 s", async () => {
			const { ana, quizId } = await withTypeAnswer();

			await ana.quiz.questions.applyTimeLimitToAll({ quizId, seconds: 10 });

			const { questions } = await ana.quiz.editor({ quizId });
			expect(questions.map((question) => question.timeLimitSeconds)).toEqual([
				10, 20,
			]);
		});
	});
});

describe("quiz.questions: slider (spec 032)", () => {
	async function withSlider() {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const {
			questions: [first],
		} = await ana.quiz.editor({ quizId });
		const added = await ana.quiz.questions.add({
			quizId,
			afterQuestionId: first?.id ?? null,
			type: "slider",
		});
		return { ana, quizId, questionId: added.question.id };
	}

	it("updates a slider's min, answer, unit and margin", async () => {
		const { ana, quizId, questionId } = await withSlider();
		const update = (
			change: Parameters<typeof ana.quiz.questions.update>[0]["change"],
		) => ana.quiz.questions.update({ quizId, questionId, change });

		await update({ kind: "sliderNumber", field: "answer", value: "600" });
		await update({ kind: "sliderNumber", field: "min", value: "-100,3" });
		await update({ kind: "sliderUnit", text: "anos" });
		await update({ kind: "answerMargin", margin: "high" });

		const { questions } = await ana.quiz.editor({ quizId });
		expect(questions[1]).toMatchObject({
			type: "slider",
			timeLimitSeconds: 20,
			min: -100.3,
			max: 630,
			answer: 600,
			unit: "anos",
			answerMargin: "high",
		});
	});

	it("refuses an invalid slider number with its domain code", async () => {
		const { ana, quizId, questionId } = await withSlider();

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "sliderNumber", field: "max", value: "1,234" },
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.INVALID_SLIDER_NUMBER" },
		});
	});

	it("changes a question to slider with remembered content", async () => {
		const { ana, quizId } = await withSlider();
		const { questions } = await ana.quiz.editor({ quizId });

		const result = await ana.quiz.questions.update({
			quizId,
			questionId: questions[0]?.id ?? "",
			change: {
				kind: "type",
				type: "slider",
				remembered: {
					type: "slider",
					min: 100,
					max: 900,
					answer: 600,
					unit: null,
					answerMargin: "low",
				},
			},
		});

		expect(result.question).toMatchObject({
			type: "slider",
			answer: 600,
			answerMargin: "low",
		});
	});
});

describe("quiz.questions: puzzle (spec 033)", () => {
	async function withPuzzle() {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const {
			questions: [first],
		} = await ana.quiz.editor({ quizId });
		const added = await ana.quiz.questions.add({
			quizId,
			afterQuestionId: first?.id ?? null,
			type: "puzzle",
		});
		return { ana, quizId, questionId: added.question.id };
	}

	it("updates and moves puzzle slots", async () => {
		const { ana, quizId, questionId } = await withPuzzle();
		const update = (
			change: Parameters<typeof ana.quiz.questions.update>[0]["change"],
		) => ana.quiz.questions.update({ quizId, questionId, change });

		await update({ kind: "puzzleItemText", index: 0, text: "Nilo" });
		await update({ kind: "puzzleItemText", index: 1, text: "Amazonas" });
		await update({ kind: "puzzleItemText", index: 2, text: "Yangtzé" });
		await update({ kind: "puzzleItemMoved", from: 2, to: 0 });

		const { questions } = await ana.quiz.editor({ quizId });
		expect(questions[1]).toMatchObject({
			type: "puzzle",
			timeLimitSeconds: 60,
			items: ["Yangtzé", "Nilo", "Amazonas", null],
		});
	});

	it("refuses a slot outside 0 to 3", async () => {
		const { ana, quizId, questionId } = await withPuzzle();

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "puzzleItemMoved", from: 0, to: 4 },
			}),
		);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
	});

	it("refuses an answer of 76 characters with its domain code", async () => {
		const { ana, quizId, questionId } = await withPuzzle();

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId,
				change: { kind: "puzzleItemText", index: 0, text: "a".repeat(76) },
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.CHOICE_TEXT_TOO_LONG" },
		});
	});

	it("remembers a puzzle's slots on a type change", async () => {
		const { ana, quizId } = await withPuzzle();
		const { questions } = await ana.quiz.editor({ quizId });

		const result = await ana.quiz.questions.update({
			quizId,
			questionId: questions[0]?.id ?? "",
			change: {
				kind: "type",
				type: "puzzle",
				remembered: { type: "puzzle", items: ["Nilo", null, "Amazonas", null] },
			},
		});

		expect(result.question).toMatchObject({
			type: "puzzle",
			items: ["Nilo", null, "Amazonas", null],
		});
	});
});
