import type { PdfPages } from "../application/ports/pdf-pages";
import {
	EncryptedSourceError,
	InvalidSourceError,
	InvalidSourcePagesError,
} from "../domain/generation";

/** A marker byte, so random bytes are "not a PDF". */
const MAGIC = 0x50;

interface FakePdf {
	pages: number;
	encrypted?: boolean;
	/** The pages a selection kept, in order. */
	selected?: number[];
}

/**
 * Test helper: the bytes of a fake PDF that `FakePdfPages` understands —
 * the marker, the page count, the password flag and the selected pages.
 */
export function fakePdf({
	pages,
	encrypted = false,
	selected = [],
}: FakePdf): Uint8Array {
	return new Uint8Array([MAGIC, pages, encrypted ? 1 : 0, ...selected]);
}

/** Test helper: reads back a fake PDF, or null for bytes that are not one. */
export function readFakePdf(bytes: Uint8Array): Required<FakePdf> | null {
	if (bytes.length < 3 || bytes[0] !== MAGIC) {
		return null;
	}
	return {
		pages: bytes[1] as number,
		encrypted: bytes[2] === 1,
		selected: [...bytes.slice(3)],
	};
}

/** Cuts fake PDFs, built with `fakePdf`, with the real adapter's errors. */
export class FakePdfPages implements PdfPages {
	async select(
		document: Uint8Array,
		pages: readonly number[],
	): Promise<Uint8Array> {
		const pdf = readFakePdf(document);
		if (!pdf) {
			throw new InvalidSourceError("Not a PDF");
		}
		if (pdf.encrypted) {
			throw new EncryptedSourceError("The PDF has a password");
		}
		if (pages.some((page) => page > pdf.pages)) {
			throw new InvalidSourcePagesError("A page is outside the document");
		}
		return fakePdf({ pages: pages.length, selected: [...pages] });
	}
}
