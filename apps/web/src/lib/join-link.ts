/** What the lobby tells players to open: the site's address without the protocol. */
export function joinAddress(origin: string): string {
	return `${origin.replace(/^https?:\/\//, "")}/join`;
}

/**
 * The link in the QR code: it carries the PIN, so the player skips typing it
 * (spec 008, RN-37), and the game, which nobody can guess, so a network out of
 * attempts at the PIN still gets in (RN-39a).
 */
export function joinLink(origin: string, pin: string, gameId: string): string {
	return `${origin}/join/${pin}?game=${encodeURIComponent(gameId)}`;
}
