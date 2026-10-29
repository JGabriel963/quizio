import { AsyncLocalStorage } from "node:async_hooks";
import { constants, inflateRawSync } from "node:zlib";
import type { PdfPages } from "@quizio/core/quiz/application/ports/pdf-pages";
import {
	EncryptedSourceError,
	InvalidSourceError,
	InvalidSourcePagesError,
} from "@quizio/core/quiz/domain/generation";
import {
	PDFArray,
	PDFDocument,
	PDFName,
	PDFObjectStreamParser,
	type PDFRawStream,
	PDFXRefStreamParser,
} from "pdf-lib";

/**
 * What the object and cross-reference streams of one PDF may decode to, in
 * all. Real documents stay far below it; a few KB of nested Flate would not.
 */
const MAX_DECODED_BYTES = 16 * 1024 * 1024;

/**
 * How many bytes the PDF being loaded may still decode, and whether a stream
 * went past it: pdf-lib skips an object whose parsing throws, so the refusal
 * is told after the load.
 */
const decodeBudget = new AsyncLocalStorage<{
	remaining: number;
	exceeded: boolean;
}>();

const FLATE = new Set([PDFName.of("FlateDecode"), PDFName.of("Fl")]);

class DecodeLimitError extends Error {}

/** Inflates as pdf-lib does (past the 2-byte header, no checksum), up to `maxBytes`. */
function inflateWithin(bytes: Uint8Array, maxBytes: number): Uint8Array {
	try {
		return inflateRawSync(bytes.subarray(2), {
			maxOutputLength: Math.max(1, maxBytes),
			finishFlush: constants.Z_SYNC_FLUSH,
		});
	} catch {
		throw new DecodeLimitError("A stream does not inflate within the limit");
	}
}

/**
 * Takes what `stream` decodes to from the budget of the PDF being loaded,
 * measured with zlib before pdf-lib's own decoder, which grows its buffer
 * without limit. Only Flate is expected in these streams.
 */
function spend(stream: PDFRawStream): void {
	const budget = decodeBudget.getStore();
	if (!budget) {
		return;
	}
	try {
		budget.remaining -= decodedSize(stream, budget.remaining);
	} catch (error) {
		budget.exceeded = true;
		throw error;
	}
	if (budget.remaining < 0) {
		budget.exceeded = true;
		throw new DecodeLimitError("The streams decode past the limit");
	}
}

/** What `stream` decodes to, or a `DecodeLimitError` past `maxBytes`. */
function decodedSize(stream: PDFRawStream, maxBytes: number): number {
	if (maxBytes < 0) {
		throw new DecodeLimitError("The streams decode past the limit");
	}
	const filter = stream.dict.lookup(PDFName.of("Filter"));
	const filters =
		filter instanceof PDFArray
			? Array.from({ length: filter.size() }, (_, index) =>
					filter.lookup(index),
				)
			: filter
				? [filter]
				: [];
	let bytes = stream.contents;
	for (const each of filters) {
		if (!(each instanceof PDFName) || !FLATE.has(each)) {
			throw new DecodeLimitError("Unexpected filter in an object stream");
		}
		bytes = inflateWithin(bytes, maxBytes);
	}
	return bytes.length;
}

/**
 * pdf-lib decodes every object stream and cross-reference stream while it
 * loads (its other streams stay compressed when pages are copied), so these
 * two parsers are where the budget is spent. Wrapped once per process.
 */
const GUARDED = Symbol.for("quizio.pdf-lib.decode-budget");
const parsers = PDFObjectStreamParser as unknown as Record<symbol, boolean>;
if (!parsers[GUARDED]) {
	parsers[GUARDED] = true;
	const parseObjectStream = PDFObjectStreamParser.forStream;
	PDFObjectStreamParser.forStream = (stream, shouldWaitForTick) => {
		spend(stream);
		return parseObjectStream(stream, shouldWaitForTick);
	};
	const parseXRefStream = PDFXRefStreamParser.forStream;
	PDFXRefStreamParser.forStream = (stream) => {
		spend(stream);
		return parseXRefStream(stream);
	};
}

async function load(
	document: Uint8Array,
	maxDecodedBytes: number,
): Promise<PDFDocument> {
	const budget = { remaining: maxDecodedBytes, exceeded: false };
	let pdf: PDFDocument;
	try {
		// Loaded even when encrypted, to tell that case apart: pdf-lib's own
		// EncryptedPDFError does not survive `instanceof` (ES5 build).
		pdf = await decodeBudget.run(budget, () =>
			PDFDocument.load(document, { ignoreEncryption: true }),
		);
	} catch {
		throw new InvalidSourceError("The file could not be read as a PDF");
	}
	if (budget.exceeded) {
		throw new InvalidSourceError("The PDF decodes to more than the limit");
	}
	if (pdf.isEncrypted) {
		throw new EncryptedSourceError("The PDF is protected by a password");
	}
	return pdf;
}

/**
 * Cuts the PDF down to the chosen pages with pdf-lib (spec 027, RN-14), so the
 * model only reads what the creator picked. Pure JavaScript: runs in a
 * serverless function. What pdf-lib decodes while loading is limited to
 * `maxDecodedBytes`, so a small file cannot fill the memory.
 */
export function createPdfLibPdfPages({
	maxDecodedBytes = MAX_DECODED_BYTES,
}: {
	maxDecodedBytes?: number;
} = {}): PdfPages {
	return {
		async select(document, pages) {
			const source = await load(document, maxDecodedBytes);
			const count = source.getPageCount();
			if (pages.some((page) => page < 1 || page > count)) {
				throw new InvalidSourcePagesError(`The document has ${count} pages`);
			}
			const selected = await PDFDocument.create();
			const copied = await selected.copyPages(
				source,
				pages.map((page) => page - 1),
			);
			for (const page of copied) {
				selected.addPage(page);
			}
			return selected.save();
		},
	};
}
