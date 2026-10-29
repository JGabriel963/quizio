/**
 * Reads the parts of a web address the domain needs, without the platform's
 * `URL` (the core has no DOM or Node types). Full checks of a link are the
 * adapter's, where the connection is made (spec 044, RN-24).
 */
const WEB_ADDRESS =
	/^([a-z][a-z0-9+.-]*):\/\/(?:[^@/?#\s]*@)?(\[[^\]/?#\s]+\]|[^:/?#@\s]+)(?::\d+)?(?:[/?#][^\s]*)?$/i;

export function webAddressParts(
	address: string,
): { scheme: string; host: string } | null {
	const trimmed = address.trim();
	if (!isUnambiguousAddress(trimmed)) {
		return null;
	}
	const match = WEB_ADDRESS.exec(trimmed);
	if (!match?.[1] || !match[2]) {
		return null;
	}
	return { scheme: match[1].toLowerCase(), host: match[2].toLowerCase() };
}

/**
 * No backslash, space or control character anywhere: browsers take `\` for
 * `/` and drop tabs and line breaks, so with any of them they would go to
 * another host than the one read here (and shown to the person).
 */
export function isUnambiguousAddress(address: string): boolean {
	for (const character of address) {
		const code = character.charCodeAt(0);
		if (code < 0x20 || code === 0x7f || character === "\\") {
			return false;
		}
		if (/\s/.test(character)) {
			return false;
		}
	}
	return true;
}

/** An `http` or `https` address with a host. */
export function isHttpAddress(address: string): boolean {
	const parts = webAddressParts(address);
	return (
		parts !== null && (parts.scheme === "http" || parts.scheme === "https")
	);
}
