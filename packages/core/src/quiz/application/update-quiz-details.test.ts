import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import {
	InvalidCoverImageError,
	QuizInTrashError,
	QuizNotFoundError,
} from "../domain/quiz";
import { QuizDescriptionTooLongError } from "../domain/quiz-details";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createUpdateQuizDetails,
	type UpdateQuizDetails,
	type UpdateQuizDetailsInput,
} from "./update-quiz-details";

const OLD_COVER = "media/user-1/old.png";
const NEW_COVER = "media/user-1/new.png";

describe("updateQuizDetails", () => {
	let quizzes: InMemoryQuizRepository;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;
	let updateQuizDetails: UpdateQuizDetails;

	const input = (
		overrides: Partial<UpdateQuizDetailsInput> = {},
	): UpdateQuizDetailsInput => ({
		ownerId: "user-1",
		quizId: "quiz-1",
		title: "Geografia",
		description: "Capitais do Brasil",
		visibility: "unlisted",
		cover: { type: "keep" },
		...overrides,
	});

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		updateQuizDetails = createUpdateQuizDetails({ quizzes, storage, clock });

		await quizzes.save(aQuiz({ coverImageKey: OLD_COVER }));
		storage.simulateUpload(OLD_COVER);
	});

	it("saves new details, keeps the cover and bumps updatedAt", async () => {
		const view = await updateQuizDetails(input());

		expect(view).toMatchObject({
			title: "Geografia",
			description: "Capitais do Brasil",
			visibility: "unlisted",
			coverImageUrl: `https://media.test/${OLD_COVER}`,
			updatedAt: clock.now(),
		});
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			title: "Geografia",
			updatedAt: clock.now(),
		});
		expect(storage.keys()).toEqual([OLD_COVER]);
	});

	it("leaves the quiz unchanged when a limit is exceeded", async () => {
		const before = await quizzes.findById("quiz-1");

		await expect(
			updateQuizDetails(input({ description: "a".repeat(501) })),
		).rejects.toThrow(QuizDescriptionTooLongError);
		expect(await quizzes.findById("quiz-1")).toEqual(before);
	});

	it("replacing the cover deletes the previous object after saving", async () => {
		storage.simulateUpload(NEW_COVER);
		const coverStoredWhenDeleting: Array<string | null | undefined> = [];
		const deleteObject = storage.delete.bind(storage);
		storage.delete = async (key) => {
			coverStoredWhenDeleting.push(
				(await quizzes.findById("quiz-1"))?.coverImageKey,
			);
			await deleteObject(key);
		};

		const view = await updateQuizDetails(
			input({ cover: { type: "set", key: NEW_COVER } }),
		);

		expect(view.coverImageUrl).toBe(`https://media.test/${NEW_COVER}`);
		expect(coverStoredWhenDeleting).toEqual([NEW_COVER]);
		expect(storage.keys()).toEqual([NEW_COVER]);
	});

	it("setting the current cover again keeps its object", async () => {
		await updateQuizDetails(input({ cover: { type: "set", key: OLD_COVER } }));

		expect(storage.keys()).toEqual([OLD_COVER]);
	});

	it("removing the cover deletes its object", async () => {
		const view = await updateQuizDetails(input({ cover: { type: "remove" } }));

		expect(view.coverImageUrl).toBeNull();
		expect(storage.keys()).toEqual([]);
	});

	it.each([
		["another owner's upload", "media/user-2/new.png"],
		["a missing upload", "media/user-1/missing.png"],
	])("rejects %s and leaves the quiz unchanged", async (_, key) => {
		storage.simulateUpload("media/user-2/new.png");
		const before = await quizzes.findById("quiz-1");

		await expect(
			updateQuizDetails(input({ cover: { type: "set", key } })),
		).rejects.toThrow(InvalidCoverImageError);
		expect(await quizzes.findById("quiz-1")).toEqual(before);
	});

	it("refuses quizzes in the trash", async () => {
		await quizzes.save(aQuiz({ trashedAt: new Date("2026-05-01T00:00:00Z") }));

		await expect(updateQuizDetails(input())).rejects.toThrow(QuizInTrashError);
	});

	it("treats another owner's quiz as not found", async () => {
		await expect(
			updateQuizDetails(input({ ownerId: "user-2" })),
		).rejects.toThrow(QuizNotFoundError);
	});
});
