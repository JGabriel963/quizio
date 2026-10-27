import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { mediaKeyExtension, mediaKeyFor } from "../../shared/domain/media-key";
import { blankQuestion, copyQuestion, type Question } from "../domain/question";
import { copyQuiz, type Quiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import { imageKeysOf } from "./question-images";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";

/**
 * A new draft of `ownerId` with the source's details and these questions,
 * owning copies of the cover and of every image, so deleting one quiz never
 * breaks the other (spec 001, RN-20; spec 007, RN-33). The owner's own
 * "Duplicar" passes the live list; a group member's, the playable version
 * (spec 037, RN-21).
 */
export async function copyQuizContent(
	deps: {
		quizzes: QuizRepository;
		questions: QuestionRepository;
		storage: ObjectStorage;
		ids: IdGenerator;
		clock: Clock;
	},
	source: Quiz,
	sourceQuestions: readonly Question[],
	ownerId: string,
): Promise<QuizDetailsView> {
	const id = deps.ids.generate();
	let coverImageKey: string | null = null;
	if (source.coverImageKey) {
		coverImageKey = mediaKeyFor(
			ownerId,
			deps.ids.generate(),
			mediaKeyExtension(source.coverImageKey) ?? "img",
		);
		await deps.storage.copy(source.coverImageKey, coverImageKey);
	}

	// One object per distinct image, shared inside the copy as it was inside
	// the source.
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
	// Same questions in the same order, under new ids (spec 003, RN-27). A
	// source from before the editor still yields a usable copy (RN-08).
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

	const copy = copyQuiz(source, {
		id,
		ownerId,
		coverImageKey,
		now: deps.clock.now(),
	});
	await deps.quizzes.save(copy);
	await deps.questions.saveList(copy.id, copiedQuestions);

	return toQuizDetailsView(copy, deps.storage, copiedQuestions.length);
}
