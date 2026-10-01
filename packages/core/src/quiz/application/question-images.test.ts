import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	InvalidQuestionImageError,
	newQuestionImage,
} from "../domain/question-image";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createDeleteQuestion } from "./delete-question";
import { createDeleteQuizPermanently } from "./delete-quiz-permanently";
import { createDiscardQuizChanges } from "./discard-quiz-changes";
import { createDuplicateQuestion } from "./duplicate-question";
import { createDuplicateQuiz } from "./duplicate-quiz";
import { createGetQuizEditor } from "./get-quiz-editor";
import { createPublishQuiz } from "./publish-quiz";
import { imageKeysOf, releaseUnusedImages } from "./question-images";
import { createUpdateQuestion } from "./update-question";

const PONTE = "media/user-1/ponte.png";
const MAPA = "media/user-1/mapa.png";
const ref = { ownerId: "user-1", quizId: "quiz-1" };
const complete = [
	{ id: "choice-1", text: "Sim", correct: true },
	{ id: "choice-2", text: "Não", correct: false },
	{ id: "choice-3", text: null, correct: false },
	{ id: "choice-4", text: null, correct: false },
];

/** Image files across the editor's use cases (spec 007). */
describe("question images", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let storage: InMemoryObjectStorage;
	let deps: {
		quizzes: InMemoryQuizRepository;
		questions: InMemoryQuestionRepository;
		versions: InMemoryQuizVersionRepository;
		storage: InMemoryObjectStorage;
		clock: FixedClock;
		ids: SequentialIdGenerator;
	};

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		deps = {
			quizzes,
			questions,
			versions,
			storage,
			clock: new FixedClock("2026-06-01T12:00:00.000Z"),
			ids: new SequentialIdGenerator("new"),
		};
		storage.simulateUpload(PONTE);
		storage.simulateUpload(MAPA);
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a", choices: complete }),
			aQuestion({ id: "b", choices: complete }),
		]);
	});

	async function publish(): Promise<void> {
		await createPublishQuiz(deps)(ref);
	}

	function setImage(questionId: string, key: string | null) {
		return createUpdateQuestion(deps)({
			...ref,
			questionId,
			change: { kind: "image", key },
		});
	}

	describe("imageKeysOf", () => {
		it("lists each file once", () => {
			expect(
				imageKeysOf([
					aQuestion({ id: "a", image: newQuestionImage(PONTE) }),
					aQuestion({ id: "b" }),
					aQuestion({ id: "c", image: newQuestionImage(PONTE) }),
					aQuestion({ id: "d", image: newQuestionImage(MAPA) }),
				]),
			).toEqual([PONTE, MAPA]);
		});
	});

	describe("releaseUnusedImages", () => {
		it("a storage failure does not throw", async () => {
			const failing = {
				delete: async () => {
					throw new Error("storage is down");
				},
			};

			await expect(
				releaseUnusedImages(
					{ versions, storage: failing },
					"quiz-1",
					[aQuestion({ image: newQuestionImage(PONTE) })],
					[aQuestion()],
				),
			).resolves.toBeUndefined();
		});
	});

	describe("updateQuestion", () => {
		it("sets the image of an existing upload", async () => {
			const { question } = await setImage("a", PONTE);

			expect(question.image).toEqual(newQuestionImage(PONTE));
			expect(questions.listOf("quiz-1")[0]?.image?.key).toBe(PONTE);
		});

		it("refuses an image of another owner", async () => {
			storage.simulateUpload("media/user-2/segredo.png");

			await expect(setImage("a", "media/user-2/segredo.png")).rejects.toThrow(
				InvalidQuestionImageError,
			);
			expect(questions.listOf("quiz-1")[0]?.image).toBeNull();
		});

		it("refuses a missing upload", async () => {
			await expect(setImage("a", "media/user-1/nunca.png")).rejects.toThrow(
				InvalidQuestionImageError,
			);
		});

		it("removing an unpublished image deletes the file", async () => {
			await setImage("a", PONTE);

			await setImage("a", null);

			expect(storage.keys()).toEqual([MAPA]);
		});

		it("replacing the image deletes the old file", async () => {
			await setImage("a", PONTE);

			await setImage("a", MAPA);

			expect(storage.keys()).toEqual([MAPA]);
		});

		it("removing a published image keeps the file and marks the change", async () => {
			await setImage("a", PONTE);
			await publish();

			await setImage("a", null);

			expect(storage.keys()).toContain(PONTE);
			expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
				true,
			);
		});

		it("adjusting a published image is a change, and undoing it is not", async () => {
			await setImage("a", PONTE);
			await publish();
			const adjust = (placement: string) =>
				createUpdateQuestion(deps)({
					...ref,
					questionId: "a",
					change: { kind: "imagePlacement", placement },
				});

			await adjust("background");
			const changed = (await quizzes.findById("quiz-1"))?.hasUnpublishedChanges;
			await adjust("media");

			expect(changed).toBe(true);
			expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
				false,
			);
		});

		it("an image of an older version stays after a new version drops it", async () => {
			await setImage("a", PONTE);
			await publish();
			await setImage("a", MAPA);
			await publish();

			await setImage("a", null);

			expect(storage.keys()).toEqual([MAPA, PONTE]);
		});
	});

	describe("duplicateQuestion", () => {
		it("the copy shares the file, and removing one keeps the other", async () => {
			await createUpdateQuestion(deps)({
				...ref,
				questionId: "a",
				change: { kind: "image", key: PONTE },
			});
			await createUpdateQuestion(deps)({
				...ref,
				questionId: "a",
				change: { kind: "imageAltText", altText: "Ponte" },
			});

			const { question: copy } = await createDuplicateQuestion(deps)({
				...ref,
				questionId: "a",
			});
			await setImage(copy.id, null);

			expect(copy.image).toEqual({
				...newQuestionImage(PONTE),
				altText: "Ponte",
			});
			expect(questions.listOf("quiz-1")[0]?.image?.key).toBe(PONTE);
			expect(storage.keys()).toContain(PONTE);
		});
	});

	describe("deleteQuestion", () => {
		it("releases the image of the deleted question", async () => {
			await setImage("b", PONTE);

			await createDeleteQuestion(deps)({ ...ref, questionId: "b" });

			expect(storage.keys()).toEqual([MAPA]);
		});

		it("keeps a published image", async () => {
			await setImage("b", PONTE);
			await publish();

			await createDeleteQuestion(deps)({ ...ref, questionId: "b" });

			expect(storage.keys()).toContain(PONTE);
		});
	});

	describe("discardQuizChanges", () => {
		it("brings the published image back and drops the draft's", async () => {
			await setImage("a", PONTE);
			await createUpdateQuestion(deps)({
				...ref,
				questionId: "a",
				change: {
					kind: "imageCrop",
					crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
				},
			});
			await publish();
			await setImage("a", null);
			await setImage("b", MAPA);

			const editor = await createDiscardQuizChanges(deps)(ref);

			expect(editor.questions[0]?.image).toEqual({
				...newQuestionImage(PONTE),
				crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
			});
			expect(editor.questions[1]?.image).toBeNull();
			expect(editor.imageUrls).toEqual({
				[PONTE]: `https://media.test/${PONTE}`,
			});
			expect(storage.keys()).toEqual([PONTE]);
		});
	});

	describe("getQuizEditor", () => {
		it("returns the urls of live and published images", async () => {
			await setImage("a", PONTE);
			await publish();
			await setImage("a", MAPA);

			const editor = await createGetQuizEditor(deps)(ref);

			expect(editor.imageUrls).toEqual({
				[MAPA]: `https://media.test/${MAPA}`,
				[PONTE]: `https://media.test/${PONTE}`,
			});
		});

		it("has no urls without images", async () => {
			expect((await createGetQuizEditor(deps)(ref)).imageUrls).toEqual({});
		});
	});

	describe("duplicateQuiz", () => {
		it("copies the question images to keys of the copy", async () => {
			await setImage("a", PONTE);
			await setImage("b", PONTE);

			const copy = await createDuplicateQuiz(deps)(ref);
			const copied = questions.listOf(copy.id);

			expect(copied[0]?.image?.key).not.toBe(PONTE);
			expect(copied[0]?.image?.key).toBe(copied[1]?.image?.key);
			expect(storage.keys()).toContain(copied[0]?.image?.key);
			expect(storage.keys()).toContain(PONTE);
		});

		it("the copy survives the permanent deletion of the original", async () => {
			await setImage("a", PONTE);
			const copy = await createDuplicateQuiz(deps)(ref);
			const copiedKey = questions.listOf(copy.id)[0]?.image?.key;
			await quizzes.save({
				...aQuiz(),
				trashedAt: new Date("2026-05-01T00:00:00.000Z"),
			});

			await createDeleteQuizPermanently(deps)(ref);

			expect(storage.keys()).toEqual([MAPA, copiedKey].sort());
		});
	});

	describe("deleteQuizPermanently", () => {
		it("deletes live and versioned images", async () => {
			await setImage("a", PONTE);
			await publish();
			await setImage("a", MAPA);
			await quizzes.save({
				...aPublishedQuiz(),
				trashedAt: new Date("2026-05-01T00:00:00.000Z"),
			});
			await versions.save(
				newQuizVersion({
					quizId: "quiz-2",
					number: 1,
					questions: [
						aQuestion({ image: newQuestionImage("media/user-1/x.png") }),
					],
					now: new Date("2026-05-01T00:00:00.000Z"),
				}),
			);
			storage.simulateUpload("media/user-1/x.png");

			await createDeleteQuizPermanently(deps)(ref);

			expect(storage.keys()).toEqual(["media/user-1/x.png"]);
		});
	});
});
