import type { AssignmentOptions } from "../../game/domain/assignment";
import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { assertCanAssign } from "../domain/group-permissions";
import { parsePostMessage } from "../domain/group-post";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupAssignments } from "./ports/group-assignments";
import type { GroupPostRepository } from "./ports/group-post-repository";

export type AssignInGroup = (input: {
	userId: string;
	groupId: string;
	quizId: string;
	deadline: Date;
	options: AssignmentOptions;
	/** "Adicionar mensagem"; absent for "Atribuir agora" (RN-10, RN-11). */
	message?: string;
}) => Promise<{ postId: string; gameId: string }>;

/**
 * "Atribuir agora" and "Publicar" (spec 038): a plain assignment of the
 * spec 029, then its post in the group. Who may assign and the message are
 * checked before the assignment exists, so a refused request creates nothing
 * (ADR 0016).
 */
export function createAssignInGroup(
	deps: GroupStoreDeps & {
		groupAssignments: GroupAssignments;
		groupPosts: GroupPostRepository;
		ids: IdGenerator;
		clock: Clock;
	},
): AssignInGroup {
	return async ({
		message: rawMessage,
		quizId,
		deadline,
		options,
		...input
	}) => {
		const { group, membership } = await requireMembership(deps, input);
		assertCanAssign(group, membership);
		const message =
			rawMessage === undefined ? null : parsePostMessage(rawMessage);
		const { gameId } = await deps.groupAssignments.create({
			ownerId: input.userId,
			quizId,
			deadline,
			options,
		});
		const postId = deps.ids.generate();
		await deps.groupPosts.createPost({
			id: postId,
			groupId: group.id,
			authorId: input.userId,
			kind: "assignment",
			message,
			gameId,
			createdAt: deps.clock.now(),
		});
		return { postId, gameId };
	};
}
