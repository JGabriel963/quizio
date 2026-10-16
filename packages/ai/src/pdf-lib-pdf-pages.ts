import type { PdfPages } from "@quizio/core/quiz/application/ports/pdf-pages";
import {
	EncryptedSourceError,
	InvalidSourceError,
	InvalidSourcePagesError,
} from "@quizio/core/quiz/domain/generation";
import { PDFDocument } from "pdf-lib";

async function load(document: Uint8Array): Promise<PDFDocument> {
	let pdf: PDFDocument;
	try {
		// Loaded even when encrypted, to tell that case apart: pdf-lib's own
		// EncryptedPDFError does not survive `instanceof` (ES5 build).
		pdf = await PDFDocument.load(document, { ignoreEncryption: true });
	} catch {
		throw new InvalidSourceError("The file could not be read as a PDF");
	}
	if (pdf.isEncrypted) {
		throw new EncryptedSourceError("The PDF is protected by a password");
	}
	return pdf;
}

/**
 * Cuts the PDF down to the chosen pages with pdf-lib (spec 027, RN-14), so the
 * model only reads what the creator picked. Pure JavaScript: runs in a
 * serverless function.
 */
export function createPdfLibPdfPages(): PdfPages {
	return {
		async select(document, pages) {
			const source = await load(document);
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
