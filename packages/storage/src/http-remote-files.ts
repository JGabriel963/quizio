import { type LookupAddress, lookup } from "node:dns";
import { BlockList, isIP, isIPv4 } from "node:net";
import type { RemoteFiles } from "@quizio/core/media/application/ports/remote-files";
import {
	FileUrlNotPublicError,
	FileUrlTooLargeError,
	FileUrlUnreachableError,
	InvalidFileUrlError,
} from "@quizio/core/media/domain/remote-file-errors";
import { Agent, request } from "undici";

export interface HttpRemoteFilesConfig {
	timeoutMs: number;
	maxRedirects: number;
	/**
	 * Integration tests only, to read from a server on this machine. The
	 * composition root never turns it on.
	 */
	allowPrivateNetworks?: boolean;
}

/** Everything that is not the public internet (RFC 6890 and its updates). */
const NOT_PUBLIC = new BlockList();
for (const [network, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
] as const) {
	NOT_PUBLIC.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
	// IETF protocol assignments, Teredo (2001::/32) among them.
	["2001::", 23],
	["2001:db8::", 32],
	// 6to4: an IPv4 address inside, which may be a private one.
	["2002::", 16],
	["3fff::", 20],
] as const) {
	NOT_PUBLIC.addSubnet(network, prefix, "ipv6");
}

/**
 * The only IPv6 addresses on the public internet (audit L13): outside it are
 * loopback, link-local, unique-local, multicast, NAT64 and the ones that carry
 * an IPv4 address, whatever the network does with them.
 */
const GLOBAL_UNICAST = new BlockList();
GLOBAL_UNICAST.addSubnet("2000::", 3, "ipv6");

/**
 * An IPv4-mapped IPv6 address is the IPv4 one it carries, in any spelling: a
 * link's host comes in hex (`new URL("http://[::ffff:127.0.0.1]")` gives
 * `[::ffff:7f00:1]`), so the address is normalized before it is read.
 */
function embeddedIPv4(ip: string): string | null {
	if (isIP(ip) !== 6) {
		return null;
	}
	const normalized = new URL(`http://[${ip}]`).hostname.slice(1, -1);
	const [, high, low] =
		/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(normalized) ?? [];
	if (high === undefined || low === undefined) {
		return null;
	}
	const [a, b] = [Number.parseInt(high, 16), Number.parseInt(low, 16)];
	return [a >> 8, a & 255, b >> 8, b & 255].join(".");
}

/** Whether an address is on the public internet (spec 044, RN-24; ADR 0023). */
export function isPublicAddress(ip: string): boolean {
	const v4 = isIPv4(ip) ? ip : embeddedIPv4(ip);
	if (v4) {
		return !NOT_PUBLIC.check(v4, "ipv4");
	}
	return (
		isIP(ip) === 6 &&
		GLOBAL_UNICAST.check(ip, "ipv6") &&
		!NOT_PUBLIC.check(ip, "ipv6")
	);
}

function fileNameOf(
	url: URL,
	contentDisposition: string | null,
): string | null {
	const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
	if (encoded) {
		return decodeURIComponent(encoded);
	}
	const quoted = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
	const plain = contentDisposition?.match(/filename=([^;]+)/i)?.[1]?.trim();
	if (quoted ?? plain) {
		return quoted ?? plain ?? null;
	}
	const last = decodeURIComponent(url.pathname.split("/").pop() ?? "");
	return /\.[a-z0-9]{2,5}$/i.test(last) ? last : null;
}

function parseHttpUrl(raw: string, base?: URL): URL {
	let url: URL;
	try {
		url = new URL(raw, base);
	} catch {
		throw new InvalidFileUrlError();
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new InvalidFileUrlError();
	}
	return url;
}

function headerOf(value: string | string[] | undefined): string | null {
	return (Array.isArray(value) ? value[0] : value) ?? null;
}

/**
 * Reads a file from a public link for an AI agent (spec 044, RN-24; ADR
 * 0023). Private networks are refused when the connection is made, by the
 * address the name resolved to, so a name that resolves differently the
 * second time (DNS rebinding) is still caught; every redirect is checked the
 * same way, and the body is never read past `maxBytes`.
 */
export function createHttpRemoteFiles(
	config: HttpRemoteFilesConfig,
): RemoteFiles {
	const allowPrivate = config.allowPrivateNetworks === true;
	const allowed = (address: string) => allowPrivate || isPublicAddress(address);

	const dispatcher = new Agent({
		connect: {
			lookup(hostname, options, callback) {
				lookup(hostname, { ...options, all: true }, (error, addresses) => {
					if (error) {
						callback(error, "", 4);
						return;
					}
					const usable = (addresses as LookupAddress[]).filter((each) =>
						allowed(each.address),
					);
					const first = usable[0];
					if (!first) {
						callback(new FileUrlNotPublicError(), "", 4);
						return;
					}
					if ((options as { all?: boolean }).all) {
						(callback as unknown as (e: null, a: LookupAddress[]) => void)(
							null,
							usable,
						);
					} else {
						callback(null, first.address, first.family);
					}
				});
			},
		},
	});

	async function open(url: URL, signal: AbortSignal) {
		// A literal address is connected to without a lookup.
		const host = url.hostname.replace(/^\[|\]$/g, "");
		if (isIP(host) && !allowed(host)) {
			throw new FileUrlNotPublicError();
		}
		try {
			return await request(url, { method: "GET", dispatcher, signal });
		} catch (error) {
			if (
				error instanceof FileUrlNotPublicError ||
				(error as { cause?: unknown }).cause instanceof FileUrlNotPublicError
			) {
				throw new FileUrlNotPublicError();
			}
			throw new FileUrlUnreachableError(`${url.host} did not answer.`);
		}
	}

	return {
		async fetch(raw, maxBytes) {
			const signal = AbortSignal.timeout(config.timeoutMs);
			let url = parseHttpUrl(raw);

			for (let redirects = 0; ; redirects++) {
				const response = await open(url, signal);
				const location = headerOf(response.headers.location);
				if (
					response.statusCode >= 300 &&
					response.statusCode < 400 &&
					location
				) {
					await response.body.dump();
					if (redirects >= config.maxRedirects) {
						throw new FileUrlUnreachableError(
							"The link redirects too many times.",
						);
					}
					url = parseHttpUrl(location, url);
					continue;
				}
				if (response.statusCode < 200 || response.statusCode >= 300) {
					await response.body.dump();
					throw new FileUrlUnreachableError(
						`The link answered ${response.statusCode}.`,
					);
				}

				const declared = Number(headerOf(response.headers["content-length"]));
				if (declared > maxBytes) {
					response.body.destroy();
					throw new FileUrlTooLargeError(maxBytes);
				}
				const chunks: Uint8Array[] = [];
				let size = 0;
				try {
					for await (const chunk of response.body) {
						size += (chunk as Uint8Array).byteLength;
						if (size > maxBytes) {
							response.body.destroy();
							throw new FileUrlTooLargeError(maxBytes);
						}
						chunks.push(chunk as Uint8Array);
					}
				} catch (error) {
					if (error instanceof FileUrlTooLargeError) {
						throw error;
					}
					throw new FileUrlUnreachableError(`${url.host} stopped answering.`);
				}

				const bytes = new Uint8Array(size);
				let offset = 0;
				for (const chunk of chunks) {
					bytes.set(chunk, offset);
					offset += chunk.byteLength;
				}
				return {
					bytes,
					contentType:
						headerOf(response.headers["content-type"])?.split(";")[0]?.trim() ??
						null,
					fileName: fileNameOf(
						url,
						headerOf(response.headers["content-disposition"]),
					),
				};
			}
		},
	};
}
