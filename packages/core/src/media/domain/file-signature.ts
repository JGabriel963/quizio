/** The file types Quizio keeps, as their first bytes tell them. */
export type SniffedFileType =
	| "image/jpeg"
	| "image/png"
	| "image/gif"
	| "image/webp"
	| "application/pdf";

function startsWith(
	bytes: Uint8Array,
	signature: readonly number[],
	offset = 0,
): boolean {
	return (
		bytes.length >= offset + signature.length &&
		signature.every((value, index) => bytes[offset + index] === value)
	);
}

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const SIGNATURES: readonly {
	type: SniffedFileType;
	parts: readonly { offset: number; bytes: readonly number[] }[];
}[] = [
	{ type: "image/jpeg", parts: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
	{
		type: "image/png",
		parts: [
			{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
		],
	},
	{ type: "image/gif", parts: [{ offset: 0, bytes: ascii("GIF87a") }] },
	{ type: "image/gif", parts: [{ offset: 0, bytes: ascii("GIF89a") }] },
	{
		type: "image/webp",
		parts: [
			{ offset: 0, bytes: ascii("RIFF") },
			{ offset: 8, bytes: ascii("WEBP") },
		],
	},
	{ type: "application/pdf", parts: [{ offset: 0, bytes: ascii("%PDF-") }] },
];

/**
 * What a file is by its first bytes (spec 044, RN-24). A file fetched from a
 * link is kept for what it is, not for what the remote server said it was.
 */
export function sniffFileType(bytes: Uint8Array): SniffedFileType | null {
	return (
		SIGNATURES.find(({ parts }) =>
			parts.every((part) => startsWith(bytes, part.bytes, part.offset)),
		)?.type ?? null
	);
}
