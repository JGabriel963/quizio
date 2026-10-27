import type { GroupPostKind } from "./group-post";

/**
 * A quiz in a group's "Compartilhado" (spec 037; ADR 0018): a reference to
 * the quiz, never a copy. The group reads the playable version in force, and
 * the row goes with the quiz, the sharer's membership and the group.
 */
export interface SharedQuiz {
	/** The share, not the quiz: a post points at it (RN-13). */
	id: string;
	groupId: string;
	quizId: string;
	/** Always the quiz's owner: only one's own quizzes are shared (RN-02). */
	sharedById: string;
	sharedAt: Date;
}

/** "Ordenar por" of the tab (RN-14). */
export const SHARED_QUIZ_SORTS = [
	"recent",
	"oldest",
	"nameAsc",
	"nameDesc",
] as const;
export type SharedQuizSort = (typeof SHARED_QUIZ_SORTS)[number];

/** The tab shows 20, then "Mostrar mais" (RN-15). */
export const SHARED_QUIZZES_PAGE_SIZE = 20;

/** At most this many quizzes in one "Compartilhar N kahoots". */
export const MAX_QUIZZES_PER_SHARE = 50;

/** One quiz is "compartilhou um kahoot", more are "múltiplos kahoots" (RN-06). */
export function sharedQuizzesPostKind(
	count: number,
): Extract<GroupPostKind, "quizShare" | "quizzesShare"> {
	return count === 1 ? "quizShare" : "quizzesShare";
}
