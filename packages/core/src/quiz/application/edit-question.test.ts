import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InvalidQuestionImageError } from "../domain/question-image";
import { QuizNotFoundError } from "../domain/quiz";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createEditQuestion, type EditQuestion } from "./edit-question";
import { createUpdateQuestion } from "./update-question";

describe("editQuestion (spec 044, RN-21, RN-34)", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let storage: InMemoryObjectStorage;
	let edit: EditQuestion;
	let deps: Parameters<typeof createEditQuestion>[0];
	const ref = { ownerId: "user-1", quizId: "quiz-1", questionId: "q1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		storage = new InMemoryObjectStorage("https://media.test");
		deps = {
			quizzes,
			questions,
			versions: new InMemoryQuizVersionRepository(),
			storage,
			clock: new FixedClock("2026-10-28T12:00:00.000Z"),
		};
		edit = createEditQuestion(deps);
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "q1", text: "Antes", aiGenerated: true }),
			aQuestion({ id: "q2" }),
		]);
	});

	const stored = (id = "q1") =>
		questions.listOf("quiz-1").find((question) => question.id === id);

	it("applies a patch and keeps the AI mark", async () => {
		const { question } = await edit({
			...ref,
			patch: { text: "Depois", timeLimitSeconds: 30 },
		});

		expect(question).toMatchObject({
			id: "q1",
			text: "Depois",
			timeLimitSeconds: 30,
			aiGenerated: true,
		});
		expect(stored()).toMatchObject({ text: "Depois", timeLimitSeconds: 30 });
	});

	it("checks a new image and releases one no longer used", async () => {
		storage.simulateUpload("media/user-1/old.png");
		storage.simulateUpload("media/user-1/new.png");
		storage.simulateUpload("media/user-2/theirs.png");
		await edit({ ...ref, patch: { image: { key: "media/user-1/old.png" } } });

		await expect(
			edit({ ...ref, patch: { image: { key: "media/user-2/theirs.png" } } }),
		).rejects.toBeInstanceOf(InvalidQuestionImageError);

		await edit({ ...ref, patch: { image: { key: "media/user-1/new.png" } } });
		expect(stored()?.image?.key).toBe("media/user-1/new.png");
		expect(await storage.exists("media/user-1/old.png")).toBe(false);
	});

	it("an edit from the agent and one from the editor on other fields both stay", async () => {
		const editorUpdate = createUpdateQuestion(deps);

		await edit({ ...ref, patch: { timeLimitSeconds: 60 } });
		await editorUpdate({ ...ref, change: { kind: "text", text: "Do editor" } });

		expect(stored()).toMatchObject({ text: "Do editor", timeLimitSeconds: 60 });
	});

	it("someone else's quiz is not found", async () => {
		await expect(
			edit({ ...ref, ownerId: "user-2", patch: { text: "?" } }),
		).rejects.toBeInstanceOf(QuizNotFoundError);
	});
});
