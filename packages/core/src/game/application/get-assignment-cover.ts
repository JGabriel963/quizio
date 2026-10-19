import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { GameNotFoundError } from "../domain/game";
import type { AssignmentLandingQuery } from "./ports/assignment-landing-query";

/**
 * What a participant sees on opening the link or typing the PIN (spec 029,
 * RN-46 to RN-48). The time is what is left, never an instant to compare
 * with the device's clock; nothing of the questions is told.
 */
export type AssignmentCoverView =
	| {
			status: "open";
			name: string;
			creatorName: string;
			remainingMs: number;
			participantCount: number;
			/** The quiz's cover, or null for the default one (spec 030, RN-01). */
			coverUrl: string | null;
			questionCount: number;
	  }
	| { status: "ended"; name: string };

export type GetAssignmentCover = (input: {
	gameId: string;
}) => Promise<AssignmentCoverView>;

export function createGetAssignmentCover(deps: {
	assignmentLanding: AssignmentLandingQuery;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}): GetAssignmentCover {
	return async ({ gameId }) => {
		const record = await deps.assignmentLanding.find(gameId);
		if (!record) {
			throw new GameNotFoundError("Assignment not found");
		}
		// A read model: past its deadline it is over, whoever stores that later.
		const remainingMs = record.expiresAt.getTime() - deps.clock.now().getTime();
		if (record.endedAt !== null || remainingMs <= 0) {
			return { status: "ended", name: record.name };
		}
		return {
			status: "open",
			name: record.name,
			creatorName: record.creatorName,
			remainingMs,
			participantCount: record.participantCount,
			coverUrl: record.coverImageKey
				? deps.storage.getPublicUrl(record.coverImageKey)
				: null,
			questionCount: record.questionCount,
		};
	};
}
