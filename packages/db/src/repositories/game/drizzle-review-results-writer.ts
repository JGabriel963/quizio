import type { ReviewResultsWriter } from "@quizio/core/game/application/ports/review-results-writer";

import type { Database } from "../../types";
import { createDrizzleAnswerRepository } from "./drizzle-answer-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";

/**
 * The review's two writes in one transaction (spec 031, RN-30a): the
 * conditional stage write, then the regrades. A failure rolls both back, so
 * the host can send the review again.
 */
export function createDrizzleReviewResultsWriter(
	db: Database,
): ReviewResultsWriter {
	return {
		advanceAndRegrade({ next, from, questionIndex, regrades, reviewedAt }) {
			return db.transaction(async (tx) => {
				if (!(await createDrizzleGameRepository(tx).saveIfAt(next, from))) {
					return false;
				}
				await createDrizzleAnswerRepository(tx).regrade(
					next.id,
					questionIndex,
					regrades,
					reviewedAt,
				);
				return true;
			});
		},
	};
}
