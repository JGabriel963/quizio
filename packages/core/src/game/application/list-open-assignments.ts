import type { Clock } from "../../shared/application/ports/clock";
import { isGameOpen } from "../domain/game";
import { settleGame } from "./game-lifecycle";
import type { AssignmentLandingQuery } from "./ports/assignment-landing-query";
import type { GameRepository } from "./ports/game-repository";

/** One line of "atividades em andamento" (spec 029, RN-05a). */
export interface OpenAssignmentView {
	gameId: string;
	/** The report's own name, or the title of the quiz then (RN-28). */
	name: string;
	pin: string;
	deadline: Date;
	remainingMs: number;
	participantCount: number;
}

export type ListOpenAssignments = (input: {
	ownerId: string;
	quizId: string;
}) => Promise<OpenAssignmentView[]>;

/**
 * The assignments of a quiz still open, the one ending first on top: what
 * "Atribuir" offers to share again before creating another (RN-05a). Another
 * creator's quiz has none.
 */
export function createListOpenAssignments(deps: {
	games: GameRepository;
	assignmentLanding: AssignmentLandingQuery;
	clock: Clock;
}): ListOpenAssignments {
	return async ({ ownerId, quizId }) => {
		const views: OpenAssignmentView[] = [];
		for (const stored of await deps.games.listUnendedByQuiz(quizId, [
			"assignment",
		])) {
			if (stored.ownerId !== ownerId) {
				continue;
			}
			// One past its deadline ends here, as anywhere it is read.
			const game = await settleGame(deps, stored);
			const landing = isGameOpen(game)
				? await deps.assignmentLanding.find(game.id)
				: null;
			if (!landing) {
				continue;
			}
			views.push({
				gameId: game.id,
				name: landing.name,
				pin: game.pin,
				deadline: game.expiresAt,
				remainingMs: game.expiresAt.getTime() - deps.clock.now().getTime(),
				participantCount: landing.participantCount,
			});
		}
		return views.sort((a, b) => a.remainingMs - b.remainingMs);
	};
}
