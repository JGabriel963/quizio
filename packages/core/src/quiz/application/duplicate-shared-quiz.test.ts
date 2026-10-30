import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryQuizShareGrants } from "../../shared/testing/in-memory-quiz-share-grants";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { QuizNotFoundError, trashQuiz } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import {
	createDuplicateSharedQuiz,
	type DuplicateSharedQuiz,
} from "./duplicate-shared-quiz";

const COVER = "media/user-1/cover.png";
const IMAGE = "media/user-1/q1.png";

describe("duplicateSharedQuiz (spec 037, RN-21)", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let grants: InMemoryQuizShareGrants;
	let storage: InMemoryObjectStorage;
	let clock: FixedClock;
	let duplicate: DuplicateSharedQuiz;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		grants = new InMemoryQuizShareGrants();
		storage = new InMemoryObjectStorage("https://media.test");
		clock = new FixedClock("2026-10-26T12:00:00.000Z");
		duplicate = createDuplicateSharedQuiz({
			quizzes,
			questions,
			quizVersions: versions,
			quizShareGrants: grants,
			storage,
			ids: new SequentialIdGenerator("new"),
			clock,
		});
		await quizzes.save(aPublishedQuiz({ coverImageKey: COVER }));
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [
					aQuestion({
						id: "q1",
						text: "Salva",
						textFormatting: { bold: [[0, 5]] },
						image: {
							key: IMAGE,
							placement: "media",
							crop: null,
							altText: null,
						},
					}),
				],
				now: clock.now(),
			}),
		);
		// The owner's working copy changed after Salvar.
		await questions.saveList("quiz-1", [
			aQuestion({ id: "q1", text: "Não salva" }),
		]);
		storage.simulateUpload(COVER);
		storage.simulateUpload(IMAGE);
		grants.grant("carla", "quiz-1");
	});

	it("copies the published version's questions, not the owner's working copy", async () => {
		const copy = await duplicate({ userId: "carla", quizId: "quiz-1" });

		const copied = await questions.listByQuiz(copy.id);
		expect(copied.map((question) => question.text)).toEqual(["Salva"]);
		// The copy keeps the formatting of the version (spec 047, RN-20).
		expect(copied[0]?.textFormatting).toEqual({ bold: [[0, 5]] });
		expect(copied[0]?.id).not.toBe("q1");
	});

	it("copies the cover and images under the member's keys and gives the draft '(cópia)'", async () => {
		const copy = await duplicate({ userId: "carla", quizId: "quiz-1" });

		expect(copy).toMatchObject({
			title: "Bom de Bíblia (Junho) (cópia)",
			status: "draft",
		});
		expect(await quizzes.findById(copy.id)).toMatchObject({
			ownerId: "carla",
			coverImageKey: expect.stringMatching(/^media\/carla\/.+\.png$/),
		});
		const [question] = await questions.listByQuiz(copy.id);
		expect(question?.image?.key).toMatch(/^media\/carla\/.+\.png$/);
		expect(storage.keys()).toHaveLength(4);
	});

	it("refuses without a grant, a trashed quiz or a draft with QUIZ.NOT_FOUND", async () => {
		await expect(
			duplicate({ userId: "diego", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);

		await quizzes.save(trashQuiz(aPublishedQuiz(), clock.now()));
		await expect(
			duplicate({ userId: "carla", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);

		await quizzes.save(aQuiz());
		await expect(
			duplicate({ userId: "carla", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
	});

	it("a member's copy has the shared quiz's theme (spec 042, RN-08)", async () => {
		await quizzes.save(
			aPublishedQuiz({ coverImageKey: COVER, themeId: "lilac" }),
		);

		const copy = await duplicate({ userId: "carla", quizId: "quiz-1" });

		expect(copy.themeId).toBe("lilac");
	});

	it("a copy of someone else's quiz starts with standard (spec 043, RN-27)", async () => {
		await quizzes.save(
			aPublishedQuiz({ coverImageKey: COVER, customThemeId: "theme-1" }),
		);

		const copy = await duplicate({ userId: "carla", quizId: "quiz-1" });

		expect(copy).toMatchObject({ themeId: "standard", customThemeId: null });
		expect((await quizzes.findById(copy.id))?.customThemeId).toBeNull();
	});

	it("the copy of someone else's quiz is private (spec 039, RN-26)", async () => {
		await quizzes.save(
			aPublishedQuiz({ coverImageKey: COVER, visibility: "public" }),
		);

		const copy = await duplicate({ userId: "carla", quizId: "quiz-1" });

		expect(copy.visibility).toBe("private");
	});
});
