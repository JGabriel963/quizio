import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { QuizShareGrants } from "../../shared/application/ports/quiz-share-grants";
import { QuizNotFoundError } from "../domain/quiz";
import { copyQuizContent } from "./copy-quiz-content";
import type { QuestionRepository } from "./ports/question-repository";
import type { QuizRepository } from "./ports/quiz-repository";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";
import type { QuizDetailsView } from "./quiz-details-view";

export type DuplicateSharedQuiz = (input: {
	userId: string;
	quizId: string;
}) => Promise<QuizDetailsView>;

/**
 * "Duplicar" and "Duplique para editar" of a quiz shared with the member's
 * group (spec 037, RN-18, RN-21): their own draft of the playable version in
 * force, never the owner's unsaved changes (RN-17).
 */
export function createDuplicateSharedQuiz(deps: {
	quizzes: QuizRepository;
	questions: QuestionRepository;
	quizVersions: QuizVersionRepository;
	quizShareGrants: QuizShareGrants;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): DuplicateSharedQuiz {
	return async ({ userId, quizId }) => {
		const source = await deps.quizzes.findById(quizId);
		// Anything the member may not use is as missing as a quiz that is not
		// there (spec 001, RN-10).
		if (
			!source ||
			source.trashedAt !== null ||
			source.publishedVersion === null ||
			!(await deps.quizShareGrants.canUse(userId, source.id))
		) {
			throw new QuizNotFoundError("Quiz not found");
		}
		const version = await deps.quizVersions.find(
			source.id,
			source.publishedVersion,
		);
		if (!version) {
			throw new QuizNotFoundError("Quiz not found");
		}
		return copyQuizContent(deps, source, version.questions, userId);
	};
}
