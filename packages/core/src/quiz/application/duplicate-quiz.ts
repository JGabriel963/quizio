import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { mediaKeyExtension, mediaKeyFor } from "../../shared/domain/media-key";
import { assertQuizEditable, copyQuiz, requireOwnedQuiz } from "../domain/quiz";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type DuplicateQuiz = (input: QuizReference) => Promise<QuizDetailsView>;

export function createDuplicateQuiz(deps: {
	quizzes: QuizRepository;
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

		const copy = copyQuiz(source, { id, coverImageKey, now: deps.clock.now() });
		await deps.quizzes.save(copy);

		return toQuizDetailsView(copy, deps.storage);
	};
}
