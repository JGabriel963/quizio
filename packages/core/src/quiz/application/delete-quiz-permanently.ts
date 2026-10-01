import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { assertPermanentlyDeletable, requireOwnedQuiz } from "../domain/quiz";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import { imageKeysOf } from "./question-images";
import type { QuizReference } from "./quiz-reference";

export type DeleteQuizPermanently = (input: QuizReference) => Promise<void>;

export function createDeleteQuizPermanently(deps: {
	quizzes: QuizRepository;
	questions: Pick<QuestionRepository, "listByQuiz" | "deleteAllOfQuiz">;
	versions: Pick<QuizVersionRepository, "listByQuiz" | "deleteAllOfQuiz">;
	storage: Pick<ObjectStorage, "delete">;
}): DeleteQuizPermanently {
	return async ({ ownerId, quizId }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		assertPermanentlyDeletable(quiz);

		// Cover first: object deletion is idempotent, so a failure here can be
		// retried, while deleting the row first would lose track of the object.
		if (quiz.coverImageKey) {
			await deps.storage.delete(quiz.coverImageKey);
		}
		// Question images too, the live ones and those of every version (spec 007, RN-37).
		const versions = await deps.versions.listByQuiz(quiz.id);
		const imageKeys = imageKeysOf([
			...(await deps.questions.listByQuiz(quiz.id)),
			...versions.flatMap((version) => version.questions),
		]);
		await Promise.all(imageKeys.map((key) => deps.storage.delete(key)));
		// The database also cascades; this keeps the rule in the core (spec 003,
		// RN-28; spec 006, RN-33).
		await deps.questions.deleteAllOfQuiz(quiz.id);
		await deps.versions.deleteAllOfQuiz(quiz.id);
		await deps.quizzes.delete(quiz.id);
	};
}
