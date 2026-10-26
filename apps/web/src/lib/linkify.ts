/** A piece of a post's text: as typed, or an address that opens (spec 036, RN-16). */
export type TextPart =
	| { type: "text"; text: string }
	| { type: "link"; text: string; href: string };

// Only these starts make a link, so no other scheme (javascript:) ever does.
const ADDRESS = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const TRAILING = /[.,;:!?'"]$/;

/**
 * Splits a post's text into plain text and links. The punctuation that ends
 * the sentence stays out of the link, and so does a ")" the link did not open.
 * The parts are rendered as text nodes, never as HTML.
 */
export function linkify(text: string): TextPart[] {
	const parts: TextPart[] = [];
	let rest = 0;
	for (const match of text.matchAll(ADDRESS)) {
		const address = trimAddress(match[0]);
		if (!/^(?:https?:\/\/|www\.)[^/.]+\./i.test(address)) {
			continue;
		}
		const start = match.index;
		if (start > rest) {
			parts.push({ type: "text", text: text.slice(rest, start) });
		}
		parts.push({
			type: "link",
			text: address,
			href: address.toLowerCase().startsWith("www.")
				? `https://${address}`
				: address,
		});
		rest = start + address.length;
	}
	if (rest < text.length) {
		parts.push({ type: "text", text: text.slice(rest) });
	}
	return parts;
}

function trimAddress(raw: string): string {
	let address = raw;
	for (;;) {
		if (TRAILING.test(address)) {
			address = address.slice(0, -1);
		} else if (address.endsWith(")") && !opensMore(address)) {
			address = address.slice(0, -1);
		} else {
			return address;
		}
	}
}

/** True when the link has at least as many "(" as ")". */
function opensMore(address: string): boolean {
	const opened = address.split("(").length - 1;
	const closed = address.split(")").length - 1;
	return opened >= closed;
}
