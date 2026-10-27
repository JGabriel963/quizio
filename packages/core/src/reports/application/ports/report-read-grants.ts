/**
 * Somebody other than a report's owner who may read it, without changing it:
 * the admin of a group where the assignment was posted (spec 038, RN-20a;
 * ADR 0016). The reports context does not know why.
 */
export interface ReportReadGrants {
	canRead(viewerId: string, gameId: string): Promise<boolean>;
}
