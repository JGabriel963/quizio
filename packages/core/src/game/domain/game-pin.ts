/** Six digits, as in Kahoot's lobby (spec 008, RN-09). */
export const GAME_PIN_LENGTH = 6;

/**
 * Wrong PINs allowed per network address in each window (RN-39). Generous on
 * purpose: a whole classroom reaches the server from one address.
 */
export const PIN_ATTEMPT_LIMIT = 30;
export const PIN_ATTEMPT_WINDOW_MS = 60_000;

const PIN_PATTERN = new RegExp(`^[1-9]\\d{${GAME_PIN_LENGTH - 1}}$`);

/**
 * Reads a PIN as typed: spaces are ignored, since the lobby shows it in two
 * groups (RN-36). Anything that could not be a PIN is null.
 */
export function parseGamePin(raw: string): string | null {
	const pin = raw.replace(/\s+/g, "");
	return PIN_PATTERN.test(pin) ? pin : null;
}

/** "265914" → "265 914" (RN-10). */
export function formatGamePin(pin: string): string {
	const half = Math.ceil(pin.length / 2);
	return `${pin.slice(0, half)} ${pin.slice(half)}`;
}
