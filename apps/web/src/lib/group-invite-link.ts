/** The link of a group's invite (spec 034, RN-21): the server keeps the code only. */
export function groupInviteLink(origin: string, code: string): string {
	return `${origin}/invite/${code}`;
}
