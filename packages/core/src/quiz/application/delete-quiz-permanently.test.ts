import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizNotFoundError, QuizNotInTrashError } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { RecordingQuizGames } from "../testing/recording-quiz-games";
import {
	createDeleteQuizPermanently,
	type DeleteQuizPermanently,
} from "./delete-quiz-permanently";

const COVER = "media/user-1/cover.png";
const trashedAt = new Date("2026-05-01T00:00:00.000Z");

describe("deleteQuizPermanently", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let storage: InMemoryObjectStorage;
	let games: RecordingQuizGames;
	let deleteQuizPermanently: DeleteQuizPermanently;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		storage = new InMemoryObjectStorage();
		games = new RecordingQuizGames();
		deleteQuizPermanently = createDeleteQuizPermanently({
			quizzes,
			questions,
			versions,
			storage,
			quizGames: games,
		});
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

	it("removes the quiz's questions", async () => {
		await quizzes.save(aQuiz({ trashedAt }));
		await questions.saveList("quiz-1", [aQuestion({ id: "a" })]);
		await questions.saveList("quiz-2", [aQuestion({ id: "b" })]);

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" });

		expect(questions.listOf("quiz-1")).toEqual([]);
		expect(questions.listOf("quiz-2")).toHaveLength(1);
	});

	it("deletes the versions with the quiz", async () => {
		const versionOf = (quizId: string) =>
			newQuizVersion({
				quizId,
				number: 1,
				questions: [aQuestion({ id: "a" })],
				now: trashedAt,
			});
		await quizzes.save(aQuiz({ trashedAt }));
		await versions.save(versionOf("quiz-1"));
		await versions.save(versionOf("quiz-2"));

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" });

		expect(versions.allOf("quiz-1")).toEqual([]);
		expect(versions.allOf("quiz-2")).toHaveLength(1);
	});

	it("ends the open games of the quiz (spec 008, RN-34)", async () => {
		await quizzes.save(aQuiz({ trashedAt }));

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" });

		expect(games.endedQuizIds).toEqual(["quiz-1"]);
	});

	it("leaves the games alone when the deletion is refused", async () => {
		await quizzes.save(aQuiz());

		await deleteQuizPermanently({ ownerId: "user-1", quizId: "quiz-1" }).catch(
			() => {},
		);

		expect(games.endedQuizIds).toEqual([]);
	});

	it("treats another owner's quiz as not found", async () => {
		await quizzes.save(aQuiz({ trashedAt }));

		await expect(
			deleteQuizPermanently({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		expect(await quizzes.findById("quiz-1")).not.toBeNull();
	});
});
