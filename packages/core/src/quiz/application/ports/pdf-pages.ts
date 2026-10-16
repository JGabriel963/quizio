/** Cuts a PDF down to the pages the creator chose (spec 027, RN-14). */
export interface PdfPages {
	/**
	 * A new PDF with only `pages` (1-based), in that order. Throws
	 * `EncryptedSourceError`, `InvalidSourceError` or, for a page the document
	 * does not have, `InvalidSourcePagesError`.
	 */
	select(document: Uint8Array, pages: readonly number[]): Promise<Uint8Array>;
}
