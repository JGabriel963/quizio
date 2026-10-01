import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isMediaKeyOwnedBy } from "../../shared/domain/media-key";
import type { Question } from "../domain/question";
import { InvalidQuestionImageError } from "../domain/question-image";
import type { QuizVersionRepository } from "./ports/quiz-version-repository";

/** A question image must be an upload that exists and belongs to the quiz owner (spec 007, RN-03). */
export async function assertUsableImage(
	storage: Pick<ObjectStorage, "exists">,
	key: string,
	ownerId: string,
): Promise<void> {
	if (!isMediaKeyOwnedBy(key, ownerId) || !(await storage.exists(key))) {
		throw new InvalidQuestionImageError(
			"Question image must be an existing upload owned by the quiz owner",
		);
	}
}

/** The distinct image files a question list uses. */
export function imageKeysOf(questions: readonly Question[]): string[] {
	return [
		...new Set(
			questions.flatMap((question) =>
				question.image ? [question.image.key] : [],
			),
		),
	];
}

/**
 * The image files of a quiz belong to the quiz: one is deleted only when no
 * live question and no stored version uses it any more (spec 007, RN-36).
 * Called after the questions are written. Best effort: a storage failure
 * leaves an orphan object behind, never a failed edit.
 */
export async function releaseUnusedImages(
	deps: {
		versions: Pick<QuizVersionRepository, "listByQuiz">;
		storage: Pick<ObjectStorage, "delete">;
	},
	quizId: string,
	before: readonly Question[],
	after: readonly Question[],
): Promise<void> {
	const kept = new Set(imageKeysOf(after));
	const dropped = imageKeysOf(before).filter((key) => !kept.has(key));
	if (dropped.length === 0) {
		return;
	}
	try {
		const versions = await deps.versions.listByQuiz(quizId);
		const published = new Set(
			versions.flatMap((version) => imageKeysOf(version.questions)),
		);
		await Promise.all(
			dropped
				.filter((key) => !published.has(key))
				.map((key) => deps.storage.delete(key)),
		);
	} catch {
		// Orphans are swept by the cleanup routine of ADR 0003.
	}
}
