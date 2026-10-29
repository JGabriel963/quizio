import { isIP } from "node:net";

/** Shared by every request whose address is unknown, so they are limited together. */
export const UNKNOWN_CLIENT_IP = "unknown";

export const DEFAULT_CLIENT_IP_HEADER = "x-forwarded-for";

/** The eight groups of an IPv6 address, whatever way it was written. */
function ipv6Groups(address: string): number[] | null {
	let canonical: string;
	try {
		canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
	} catch {
		return null;
	}
	const [head = "", tail] = canonical.split("::");
	const left = head ? head.split(":") : [];
	const right = tail ? tail.split(":") : [];
	const groups =
		tail === undefined
			? left
			: [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
	return groups.length === 8
		? groups.map((group) => Number.parseInt(group, 16))
		: null;
}

/**
 * The address as the limits count it (audit L2): IPv4 whole, an IPv4 carried
 * in IPv6 as that IPv4, and IPv6 by its /64, since one home or phone gets a
 * whole /64 and could take a new address for every attempt.
 */
function networkOf(address: string): string | null {
	const version = isIP(address);
	if (version === 4) {
		return address;
	}
	const groups = version === 6 ? ipv6Groups(address) : null;
	if (!groups) {
		return null;
	}
	const [a, b, c, d, e, f, g, h] = groups;
	if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff) {
		return [(g ?? 0) >> 8, (g ?? 0) & 255, (h ?? 0) >> 8, (h ?? 0) & 255].join(
			".",
		);
	}
	return `${groups
		.slice(0, 4)
		.map((group) => group.toString(16))
		.join(":")}::/64`;
}

/**
 * The caller's network address, as the proxy in front of the app reports it
 * in `header`, which has to be one a client cannot set alone. Of a list, the
 * last entry is taken: a proxy that appends to what the client sent puts the
 * address it saw at the end (audit L2). It keys the limits on wrong game PINs
 * and on joins (spec 008, RN-39, RN-45a).
 */
export function clientIpOf(
	headers: Headers,
	header = DEFAULT_CLIENT_IP_HEADER,
): string {
	const last = headers.get(header)?.split(",").at(-1)?.trim() ?? "";
	return networkOf(last) ?? UNKNOWN_CLIENT_IP;
}
