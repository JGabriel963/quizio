/** When each user last opened each group, for "Grupos recentes" (spec 034, RN-20). */
export interface GroupVisitRepository {
	touch(userId: string, groupId: string, at: Date): Promise<void>;
}
