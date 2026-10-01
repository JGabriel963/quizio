import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { mediaKeyExtension, mediaKeyFor } from "../../shared/domain/media-key";
import { blankQuestion, copyQuestion } from "../domain/question";
import { assertQuizEditable, copyQuiz, requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { imageKeysOf } from "./question-images";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type DuplicateQuiz = (input: QuizReference) => Promise<QuizDetailsView>;

export function createDuplicateQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): DuplicateQuiz {
	return async ({ ownerId, quizId }) => {
		const source = requireOwnedQuiz(
			await deps.quizzes.findById(quizId),
			ownerId,
		);
		// Checked before touching storage so a refused copy leaves no orphan object.
		assertQuizEditable(source);

		const id = deps.ids.generate();
		let coverImageKey: string | null = null;
		if (source.coverImageKey) {
			// Each quiz owns its cover object, so deleting one never breaks the other (RN-20).
			coverImageKey = mediaKeyFor(
				ownerId,
				deps.ids.generate(),
				mediaKeyExtension(source.coverImageKey) ?? "img",
			);
			await deps.storage.copy(source.coverImageKey, coverImageKey);
		}

		// Same questions in the same order, under new ids (spec 003, RN-27). A
		// source from before the editor still yields a usable copy (RN-08).
		const sourceQuestions = await deps.questions.listByQuiz(source.id);
		// The copy owns its image files too (spec 007, RN-33): one object per
		// distinct image, shared inside the copy as it was inside the source.
		const copiedKeys = new Map<string, string>();
		for (const key of imageKeysOf(sourceQuestions)) {
			copiedKeys.set(
				key,
				mediaKeyFor(
					ownerId,
					deps.ids.generate(),
					mediaKeyExtension(key) ?? "img",
				),
			);
		}
		await Promise.all(
			[...copiedKeys].map(([from, to]) => deps.storage.copy(from, to)),
		);
		const copiedQuestions =
			sourceQuestions.length > 0
				? sourceQuestions.map((question) => {
						const copy = copyQuestion(question, deps.ids.generate());
						return copy.image
							? {
									...copy,
									image: {
										...copy.image,
										key: copiedKeys.get(copy.image.key) ?? copy.image.key,
									},
								}
							: copy;
					})
				: [blankQuestion(deps.ids.generate())];

		const copy = copyQuiz(source, { id, coverImageKey, now: deps.clock.now() });
		await deps.quizzes.save(copy);
		await deps.questions.saveList(copy.id, copiedQuestions);

		return toQuizDetailsView(copy, deps.storage, copiedQuestions.length);
	};
}
