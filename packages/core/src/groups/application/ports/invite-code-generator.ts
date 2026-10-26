/** The secret of a group's invite link (spec 034, RN-23). */
export interface InviteCodeGenerator {
	/** Unguessable and URL-safe. */
	generate(): string;
}
