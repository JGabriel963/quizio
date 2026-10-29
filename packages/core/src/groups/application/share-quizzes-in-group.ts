import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import {
	QuizAlreadySharedError,
	QuizNotShareableError,
} from "../domain/group-errors";
import { assertCanShare } from "../domain/group-permissions";
import { parseOptionalPostMessage } from "../domain/group-post";
import {
	MAX_QUIZZES_PER_SHARE,
	type SharedQuiz,
	sharedQuizzesPostKind,
} from "../domain/shared-quiz";
import { type GroupPostLimitDeps, reserveGroupPost } from "./group-post-limit";
import { type InboxSignalDeps, signalOtherMembers } from "./inbox-signals";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupSharedQuizRepository } from "./ports/group-shared-quiz-repository";
import type { SharedQuizReads } from "./ports/shared-quiz-reads";

export type ShareQuizzesInGroup = (input: {
	userId: string;
	groupId: string;
	quizIds: readonly string[];
	/** "Criar publicação" with one quiz; the Compart. sends none (RN-06, RN-08). */
	message?: string;
}) => Promise<{ postId: string }>;

/**
 * "Compartilhar N kahoots" and "Publicar" with a quiz (spec 037): the shares
 * and their post go in together, or nothing does (RN-06).
 */
export function createShareQuizzesInGroup(
	deps: GroupStoreDeps &
		GroupPostLimitDeps & {
			groupSharedQuizzes: GroupSharedQuizRepository;
			sharedQuizReads: SharedQuizReads;
			ids: IdGenerator;
			clock: Clock;
		} & InboxSignalDeps,
): ShareQuizzesInGroup {
	return async ({ quizIds, message: rawMessage, ...input }) => {
		const { group, membership } = await requireMembership(deps, input);
		assertCanShare(group, membership);
		await reserveGroupPost(deps, input.userId);
		const message =
			rawMessage === undefined ? null : parseOptionalPostMessage(rawMessage);
		const wanted = [...new Set(quizIds)];
		if (wanted.length === 0 || wanted.length > MAX_QUIZZES_PER_SHARE) {
			throw new QuizNotShareableError();
		}
		const shareable = new Set(
			await deps.sharedQuizReads.shareableQuizIds(input.userId, wanted),
		);
		if (wanted.some((quizId) => !shareable.has(quizId))) {
			throw new QuizNotShareableError();
		}

		const now = deps.clock.now();
		const shares: SharedQuiz[] = wanted.map((quizId) => ({
			id: deps.ids.generate(),
			groupId: group.id,
			quizId,
			sharedById: input.userId,
			sharedAt: now,
		}));
		const kind = sharedQuizzesPostKind(shares.length);
		const postId = deps.ids.generate();
		const outcome = await deps.groupSharedQuizzes.shareWithPost(shares, {
			id: postId,
			groupId: group.id,
			authorId: input.userId,
			kind,
			message,
			gameId: null,
			file: null,
			sharedQuizId: kind === "quizShare" ? (shares[0]?.id ?? null) : null,
			createdAt: now,
		});
		if (outcome === "alreadyShared") {
			throw new QuizAlreadySharedError();
		}
		await signalOtherMembers(deps, group.id, input.userId);
		return { postId };
	};
}
