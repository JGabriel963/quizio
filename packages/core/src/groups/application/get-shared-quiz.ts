import type { Question } from "../../quiz/domain/question";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { SharedQuizNotFoundError } from "../domain/group-errors";
import { canUnshare } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { SharedQuizReads } from "./ports/shared-quiz-reads";

/** The page of a shared quiz (spec 037, RN-16). */
export interface SharedQuizView {
	quizId: string;
	title: string;
	description: string;
	coverUrl: string | null;
	visibility: "private" | "unlisted";
	owner: { userId: string; name: string };
	sharedBy: { userId: string; name: string };
	sharedAt: Date;
	/** "N jogos" and "N participantes", of any host. */
	games: number;
	participants: number;
	/**
	 * The playable version in force, with the right answers: "Mostrar
	 * respostas" is only the screen's (RN-16, RN-17).
	 */
	questions: Question[];
	/** Each question image's key → its public URL. */
	imageUrls: Record<string, string>;
	/** The owner goes to the quiz's own page instead (RN-10). */
	ownedByViewer: boolean;
	canUnshare: boolean;
}

export type GetSharedQuiz = (input: {
	userId: string;
	groupId: string;
	quizId: string;
}) => Promise<SharedQuizView>;

export function createGetSharedQuiz(
	deps: GroupStoreDeps & {
		sharedQuizReads: SharedQuizReads;
		storage: ObjectStorage;
	},
): GetSharedQuiz {
	return async ({ quizId, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const detail = await deps.sharedQuizReads.sharedQuizDetail(
			input.groupId,
			quizId,
		);
		// Not shared, removed, or in its owner's trash (RN-23, RN-25).
		if (!detail) {
			throw new SharedQuizNotFoundError();
		}
		const imageUrls: Record<string, string> = {};
		for (const question of detail.questions) {
			if (question.image) {
				imageUrls[question.image.key] = deps.storage.getPublicUrl(
					question.image.key,
				);
			}
		}
		return {
			quizId: detail.quizId,
			title: detail.title,
			description: detail.description,
			coverUrl: detail.coverImageKey
				? deps.storage.getPublicUrl(detail.coverImageKey)
				: null,
			visibility: detail.visibility,
			owner: { userId: detail.ownerId, name: detail.ownerName },
			sharedBy: { userId: detail.sharedById, name: detail.sharedByName },
			sharedAt: detail.sharedAt,
			games: detail.games,
			participants: detail.participants,
			questions: detail.questions,
			imageUrls,
			ownedByViewer: detail.ownerId === input.userId,
			canUnshare: canUnshare(detail, membership),
		};
	};
}
