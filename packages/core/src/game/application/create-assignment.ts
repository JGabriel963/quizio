import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { QuizShareGrants } from "../../shared/application/ports/quiz-share-grants";
import {
	type AssignmentOptions,
	assertAssignmentDeadline,
	newAssignment,
} from "../domain/assignment";
import {
	GameQuizNotFoundError,
	isGameOpen,
	QuizNotPlayableError,
} from "../domain/game";
import { arrangeGameQuestions } from "../domain/game-question";
import { settleGame } from "./game-lifecycle";
import type { AssignmentPinGenerator } from "./ports/assignment-pin-generator";
import type { AssignmentPreferencesRepository } from "./ports/assignment-preferences-repository";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayableQuizQuery } from "./ports/playable-quiz-query";

export type CreateAssignment = (input: {
	ownerId: string;
	quizId: string;
	deadline: Date;
	options: AssignmentOptions;
}) => Promise<{ gameId: string; pin: string }>;

/** Far more than a space of 100 million PINs needs; guards against a broken generator. */
const PIN_DRAWS = 5;

/**
 * "Criar uma tarefa" (spec 029, RN-04 to RN-17): an assignment of the
 * playable version in force, with its questions copied now, so later edits
 * of the quiz never reach it. It ends no other game of the quiz (RN-05).
 */
export function createCreateAssignment(deps: {
	playableQuizzes: PlayableQuizQuery;
	quizShareGrants: QuizShareGrants;
	games: GameRepository;
	gameQuestions: GameQuestionRepository;
	assignmentPins: AssignmentPinGenerator;
	assignmentPreferences: Pick<AssignmentPreferencesRepository, "save">;
	ids: IdGenerator;
	clock: Clock;
	maxDeadlineDays: number;
}): CreateAssignment {
	return async ({ ownerId, quizId, deadline, options }) => {
		const quiz = await deps.playableQuizzes.find(quizId);
		// Somebody else's quiz is theirs to use when a group shares it with
		// them (spec 037, RN-19, RN-20); otherwise it is as missing as one
		// that is not there.
		if (
			!quiz ||
			(quiz.ownerId !== ownerId &&
				!(await deps.quizShareGrants.canUse(ownerId, quiz.id)))
		) {
			throw new GameQuizNotFoundError("Quiz not found");
		}
		if (quiz.trashed || quiz.version === null) {
			throw new QuizNotPlayableError(
				"Only a published quiz out of the trash can be assigned",
			);
		}
		const now = deps.clock.now();
		assertAssignmentDeadline(deadline, now, deps.maxDeadlineDays);

		// Each participant gets their own answer order (spec 029-2/2): the copy
		// keeps the version's.
		const questions = arrangeGameQuestions(
			await deps.playableQuizzes.questions(quiz.id, quiz.version),
			{ randomizeQuestions: false, randomizeAnswers: false },
			(items) => [...items],
		);
		if (questions.length === 0) {
			throw new QuizNotPlayableError("The playable version has no questions");
		}

		for (let draw = 0; draw < PIN_DRAWS; draw++) {
			const pin = deps.assignmentPins.generate();
			const holder = await deps.games.findUnendedByPin(pin);
			// A game past its deadline frees its PIN as soon as it is settled.
			if (holder && isGameOpen(await settleGame(deps, holder))) {
				continue;
			}
			const game = newAssignment({
				id: deps.ids.generate(),
				ownerId,
				quizId: quiz.id,
				quizVersion: quiz.version,
				title: quiz.title ?? "",
				pin,
				deadline,
				options,
				questionCount: questions.length,
				themeId: quiz.themeId,
				customTheme: quiz.customTheme,
				now,
			});
			if ((await deps.games.create(game)) === "created") {
				await deps.gameQuestions.saveAll(game.id, questions);
				// The next assignment starts from these (RN-14).
				await deps.assignmentPreferences.save(ownerId, options);
				return { gameId: game.id, pin };
			}
		}
		throw new Error("Could not draw a free assignment PIN");
	};
}
