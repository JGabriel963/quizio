import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizNotFoundError, QuizNotInTrashError } from "../domain/quiz";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createDeleteQuizPermanently,
	type DeleteQuizPermanently,
} from "./delete-quiz-permanently";

const COVER = "media/user-1/cover.png";
const trashedAt = new Date("2026-05-01T00:00:00.000Z");

describe("deleteQuizPermanently", () => {
	let quizzes: InMemoryQuizRepository;
	let storage: InMemoryObjectStorage;
	let deleteQuizPermanently: DeleteQuizPermanently;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		storage = new InMemoryObjectStorage();
		deleteQuizPermanently = createDeleteQuizPermanently({ quizzes, storage });
	});

	it("refuses quizzes outside the trash", async () => {
		await quizzes.save(aQuiz());

		await expect(
			deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotInTrashError);
		expect(await quizzes.findById("quiz-1")).not.toBeNull();
	});

	it("deletes the cover object before removing the quiz", async () => {
		await quizzes.save(aQuiz({ coverImageKey: COVER, trashedAt }));
		storage.simulateUpload(COVER);
		const quizExistedWhenDeletingCover: boolean[] = [];
		const deleteObject = storage.delete.bind(storage);
		storage.delete = async (key) => {
			quizExistedWhenDeletingCover.push(
				(await quizzes.findById("quiz-1")) !== null,
			);
			await deleteObject(key);
		};

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" });

		expect(quizExistedWhenDeletingCover).toEqual([true]);
		expect(await quizzes.findById("quiz-1")).toBeNull();
		expect(storage.keys()).toEqual([]);
	});

	it("deletes quizzes without a cover", async () => {
		await quizzes.save(aQuiz({ trashedAt }));

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" });

		expect(await quizzes.findById("quiz-1")).toBeNull();
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save(aQuiz({ trashedAt }));

		await expect(
			deleteQuizPermanently({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		expect(await quizzes.findById("quiz-1")).not.toBeNull();
	});
});
