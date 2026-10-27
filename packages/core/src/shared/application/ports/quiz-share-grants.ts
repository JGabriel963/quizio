/**
 * Who may use a quiz they do not own: a member of a group the quiz is shared
 * in (spec 037; ADR 0018), or anybody when the quiz is public, published and
 * out of the trash (spec 039, RN-33; ADR 0019). The game, the quiz and the
 * reports ask it without knowing about groups or profiles, as the reports ask
 * `ReportReadGrants`.
 */
export interface QuizShareGrants {
	canUse(userId: string, quizId: string): Promise<boolean>;
}
