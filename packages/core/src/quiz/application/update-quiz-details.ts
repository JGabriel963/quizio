import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { changeQuizDetails, requireOwnedQuiz } from "../domain/quiz";
import { parseQuizDetails } from "../domain/quiz-details";
import { assertUsableCover } from "./assert-usable-cover";
import type { QuizRepository } from "./ports/quiz-repository";
import { type QuizDetailsView, toQuizDetailsView } from "./quiz-details-view";
import type { QuizReference } from "./quiz-reference";

export type CoverChange =
	| { type: "keep" }
	| { type: "remove" }
	| { type: "set"; key: string };

export interface UpdateQuizDetailsInput extends QuizReference {
	title: string | null;
	description: string | null;
	visibility: string;
	cover: CoverChange;
}

export type UpdateQuizDetails = (
	input: UpdateQuizDetailsInput,
) => Promise<QuizDetailsView>;

export function createUpdateQuizDetails(deps: {
	quizzes: QuizRepository;
	storage: ObjectStorage;
	clock: Clock;
}): UpdateQuizDetails {
	async function resolveCover(
		current: string | null,
		change: CoverChange,
		ownerId: string,
	): Promise<string | null> {
		switch (change.type) {
			case "keep":
				return current;
			case "remove":
				return null;
			case "set":
				if (change.key !== current) {
					await assertUsableCover(deps.storage, change.key, ownerId);
				}
				return change.key;
		}
	}

	return async ({ ownerId, quizId, cover, ...rawDetails }) => {
		const quiz = requireOwnedQuiz(await deps.quizzes.findById(quizId), ownerId);
		const details = parseQuizDetails(rawDetails);
		const coverImageKey = await resolveCover(
			quiz.coverImageKey,
			cover,
			ownerId,
		);

		const updated = changeQuizDetails(
			quiz,
			{ details, coverImageKey },
			deps.clock.now(),
		);
		await deps.quizzes.save(updated);

		// Only after saving, so the quiz never points to a deleted object.
		if (quiz.coverImageKey && quiz.coverImageKey !== updated.coverImageKey) {
			await deps.storage.delete(quiz.coverImageKey);
		}

		return toQuizDetailsView(updated, deps.storage);
	};
}
