import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PDF_PASSWORD_MESSAGE, PdfOpenError } from "@/lib/pdf-document";

import { ExtractOrGenerateStep } from "./extract-or-generate-step";
import { PdfPagesStep, type PdfPagesStepProps } from "./pdf-pages-step";
import { PdfUploadStep, type PdfUploadStepProps } from "./pdf-upload-step";

const handle = (pageTexts: string[]) => ({
	pageCount: pageTexts.length,
	pageTexts: vi.fn(async () => pageTexts),
	renderPage: vi.fn(async () => {}),
	destroy: vi.fn(async () => {}),
});

const pdfFile = (size = 1000, type = "application/pdf", name = "lista.pdf") =>
	new File([new Uint8Array(size)], name, { type });

function renderUpload(overrides: Partial<PdfUploadStepProps> = {}) {
	const props: PdfUploadStepProps = {
		openPdf: vi.fn(async () => handle(["Texto", "Mais texto"])),
		uploadSource: vi.fn(async () => "sources/user-1/doc.pdf"),
		onLoaded: vi.fn(),
		...overrides,
	};
	render(<PdfUploadStep {...props} />);
	return { props, user: userEvent.setup() };
}

const fileInput = () =>
	screen.getByLabelText("Carregar arquivo", { selector: "input" });

describe("PdfUploadStep (spec 027)", () => {
	it("states the size, page limit and format", () => {
		renderUpload();

		expect(screen.getByText("Solte seu arquivo aqui")).toBeInTheDocument();
		expect(
			screen.getByText("Tamanho máximo do arquivo: 20 MB"),
		).toBeInTheDocument();
		expect(screen.getByText("Limite: 50 páginas")).toBeInTheDocument();
		expect(screen.getByText("Formato: .pdf")).toBeInTheDocument();
	});

	it("reads, sends and hands over the PDF", async () => {
		const { props, user } = renderUpload();

		await user.upload(fileInput(), pdfFile());

		await waitFor(() =>
			expect(props.onLoaded).toHaveBeenCalledWith(
				{
					key: "sources/user-1/doc.pdf",
					name: "lista.pdf",
					pageTexts: ["Texto", "Mais texto"],
				},
				expect.objectContaining({ pageCount: 2 }),
			),
		);
	});

	it("refuses an image", async () => {
		const { props } = renderUpload();

		fireEvent.change(fileInput(), {
			target: { files: [pdfFile(10, "image/png", "foto.png")] },
		});

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Envie um arquivo PDF.",
		);
		expect(props.openPdf).not.toHaveBeenCalled();
	});

	it("refuses a file over 20 MB", async () => {
		const { props, user } = renderUpload();

		await user.upload(fileInput(), pdfFile(20 * 1024 * 1024 + 1));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"O arquivo passa de 20 MB.",
		);
		expect(props.uploadSource).not.toHaveBeenCalled();
	});

	it("tells a password-protected PDF", async () => {
		const { props, user } = renderUpload({
			openPdf: vi.fn(async () => {
				throw new PdfOpenError(PDF_PASSWORD_MESSAGE);
			}),
		});

		await user.upload(fileInput(), pdfFile());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			PDF_PASSWORD_MESSAGE,
		);
		expect(props.uploadSource).not.toHaveBeenCalled();
	});
});

function renderPages(overrides: Partial<PdfPagesStepProps> = {}) {
	const props: PdfPagesStepProps = {
		document: handle(["Um", "Dois"]),
		pages: [],
		extract: false,
		createDisabledReason: null,
		onTogglePage: vi.fn(),
		onSelectAll: vi.fn(),
		onExtractChange: vi.fn(),
		onCreate: vi.fn(),
		...overrides,
	};
	render(<PdfPagesStep {...props} />);
	return { props, user: userEvent.setup() };
}

describe("PdfPagesStep (spec 027)", () => {
	it("lists the pages unchecked with the page limit", async () => {
		const { props, user } = renderPages();

		expect(screen.getByText("Limite de páginas: 50")).toBeInTheDocument();
		const first = screen.getByRole("checkbox", { name: "Página 1" });
		expect(first).not.toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Página 2" }),
		).toBeInTheDocument();

		await user.click(first);
		await user.click(screen.getByRole("button", { name: "Selecionar tudo" }));

		expect(props.onTogglePage).toHaveBeenCalledWith(1);
		expect(props.onSelectAll).toHaveBeenCalledOnce();
	});

	it("Crie is disabled with no page checked", async () => {
		const { props, user } = renderPages();

		const create = screen.getByRole("button", { name: "Crie" });
		expect(create).toHaveAttribute("aria-disabled", "true");
		await user.click(create);

		expect(props.onCreate).not.toHaveBeenCalled();
	});

	it("the switch asks to extract", async () => {
		const { props, user } = renderPages({ pages: [1] });

		await user.click(screen.getByRole("switch", { name: "Extrair perguntas" }));
		await user.click(screen.getByRole("button", { name: "Crie" }));

		expect(props.onExtractChange).toHaveBeenCalledWith(true);
		expect(props.onCreate).toHaveBeenCalledOnce();
	});
});

describe("ExtractOrGenerateStep (spec 027)", () => {
	it("offers generate and extract", async () => {
		const onChoose = vi.fn();
		render(<ExtractOrGenerateStep onChoose={onChoose} />);
		const user = userEvent.setup();

		expect(
			screen.getByRole("heading", {
				name: "Extrair perguntas e as adicionar ao seu quiz?",
			}),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Gerar perguntas" }));
		await user.click(screen.getByRole("button", { name: "Extrair perguntas" }));

		expect(onChoose.mock.calls).toEqual([[false], [true]]);
	});
});
