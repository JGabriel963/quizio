import { GENERATION_MAX_PAGES } from "@quizio/core/quiz/domain/generation";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { UploadIcon } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";

import { PERSONAL_DATA_NOTICE, pdfFileProblem } from "@/lib/assistant-labels";
import type { LoadedPdf } from "@/lib/assistant-state";
import {
	PDF_INVALID_MESSAGE,
	type PdfDocumentHandle,
	PdfOpenError,
} from "@/lib/pdf-document";

const UPLOAD_FAILED_MESSAGE =
	"Não foi possível enviar o arquivo. Tente de novo.";

export interface PdfUploadStepProps {
	openPdf: (data: Uint8Array) => Promise<PdfDocumentHandle>;
	uploadSource: (
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<string>;
	onLoaded: (pdf: LoadedPdf, document: PdfDocumentHandle) => void;
}

type UploadState =
	| { kind: "idle" }
	| { kind: "busy"; label: string }
	| { kind: "error"; message: string };

/**
 * "Carregar arquivo" (spec 027, RN-12, RN-13): the PDF is checked and read in
 * the browser, then sent straight to storage.
 */
export function PdfUploadStep({
	openPdf,
	uploadSource,
	onLoaded,
}: PdfUploadStepProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [state, setState] = useState<UploadState>({ kind: "idle" });
	const [dragging, setDragging] = useState(false);

	async function take(file: File | undefined) {
		if (!file || state.kind === "busy") {
			return;
		}
		const problem = pdfFileProblem(file);
		if (problem) {
			setState({ kind: "error", message: problem });
			return;
		}
		setState({ kind: "busy", label: "Lendo o arquivo…" });
		let document: PdfDocumentHandle;
		let pageTexts: string[];
		try {
			document = await openPdf(new Uint8Array(await file.arrayBuffer()));
			pageTexts = await document.pageTexts();
		} catch (error) {
			setState({
				kind: "error",
				message:
					error instanceof PdfOpenError ? error.message : PDF_INVALID_MESSAGE,
			});
			return;
		}
		try {
			setState({ kind: "busy", label: "Enviando… 0%" });
			const key = await uploadSource(file, (fraction) =>
				setState({
					kind: "busy",
					label: `Enviando… ${Math.round(fraction * 100)}%`,
				}),
			);
			setState({ kind: "idle" });
			onLoaded({ key, name: file.name, pageTexts }, document);
		} catch {
			void document.destroy();
			setState({ kind: "error", message: UPLOAD_FAILED_MESSAGE });
		}
	}

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragging(false);
		void take(event.dataTransfer.files[0]);
	};

	return (
		<div className="flex h-full flex-col gap-3 p-4 sm:p-6">
			<section
				aria-label="Carregar arquivo"
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={onDrop}
				className={cn(
					"flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
					dragging ? "border-primary bg-primary/5" : "border-border",
				)}
			>
				<div className="flex items-start gap-3 text-left">
					<UploadIcon aria-hidden="true" className="mt-4 size-6 shrink-0" />
					<div className="flex flex-col text-muted-foreground text-xs">
						<p className="mb-1 font-bold text-foreground text-sm">
							Solte seu arquivo aqui
						</p>
						<p>Tamanho máximo do arquivo: 20 MB</p>
						<p>{`Limite: ${GENERATION_MAX_PAGES} páginas`}</p>
						<p>Formato: .pdf</p>
					</div>
				</div>
				<input
					ref={inputRef}
					type="file"
					accept="application/pdf,.pdf"
					aria-label="Carregar arquivo"
					className="sr-only"
					tabIndex={-1}
					onChange={(event) => {
						void take(event.target.files?.[0]);
						event.target.value = "";
					}}
				/>
				<Button
					disabled={state.kind === "busy"}
					onClick={() => inputRef.current?.click()}
				>
					{state.kind === "busy" ? state.label : "Carregar arquivo"}
				</Button>
				{state.kind === "error" && (
					<p role="alert" className="font-semibold text-destructive text-sm">
						{state.message}
					</p>
				)}
			</section>
			<p className="text-center text-muted-foreground text-xs">
				{PERSONAL_DATA_NOTICE}
			</p>
		</div>
	);
}
