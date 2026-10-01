import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BackgroundNoticeDialog } from "./background-notice-dialog";
import { CropImageDialog } from "./crop-image-dialog";
import { MediaDetailsDialog } from "./media-details-dialog";
import { UploadImageDialog } from "./upload-image-dialog";

const URL = "https://media.test/media/user-1/ponte.png";
const png = (name = "ponte.png") =>
	new File(["x"], name, { type: "image/png" });

describe("UploadImageDialog", () => {
	function renderDialog(
		props: Partial<Parameters<typeof UploadImageDialog>[0]> = {},
	) {
		const handlers = { onFile: vi.fn(), onClose: vi.fn() };
		render(
			<UploadImageDialog
				open
				progress={null}
				error={null}
				{...handlers}
				{...props}
			/>,
		);
		return { handlers, user: userEvent.setup({ applyAccept: false }) };
	}

	it("tells the limits and offers to pick, drop or paste", () => {
		renderDialog();

		const dialog = screen.getByRole("dialog", { name: "Carregar imagem" });
		expect(dialog).toHaveTextContent(
			"Arraste, carregue ou cole seu arquivo aqui",
		);
		expect(dialog).toHaveTextContent("Tamanho máx. do arquivo: 10 MB");
		expect(dialog).toHaveTextContent("Formato: JPEG, PNG, GIF ou WebP");
		expect(screen.getByLabelText("Carregar mídia")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
	});

	it("sends a picked file", async () => {
		const { handlers, user } = renderDialog();
		const picked = png();

		await user.upload(screen.getByLabelText("Carregar mídia"), picked);

		expect(handlers.onFile).toHaveBeenCalledExactlyOnceWith(picked);
	});

	it("sends a pasted image", () => {
		const { handlers } = renderDialog();
		const pasted = png("colada.png");

		fireEvent.paste(document, { clipboardData: { files: [pasted] } });

		expect(handlers.onFile).toHaveBeenCalledExactlyOnceWith(pasted);
	});

	it("sends a dropped image", () => {
		const { handlers } = renderDialog();
		const dropped = png();
		const zone = document.querySelector(
			"[data-slot=upload-drop-zone]",
		) as HTMLElement;

		fireEvent.drop(zone, { dataTransfer: { files: [dropped] } });

		expect(handlers.onFile).toHaveBeenCalledExactlyOnceWith(dropped);
	});

	it("refuses a file that is not an accepted image", async () => {
		const { handlers, user } = renderDialog();

		await user.upload(
			screen.getByLabelText("Carregar mídia"),
			new File(["x"], "doc.pdf", { type: "application/pdf" }),
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
		);
		expect(handlers.onFile).not.toHaveBeenCalled();
	});

	it("does not listen to paste while closed", () => {
		const { handlers } = renderDialog({ open: false });

		fireEvent.paste(document, { clipboardData: { files: [png()] } });

		expect(handlers.onFile).not.toHaveBeenCalled();
	});

	it("shows the progress while sending", () => {
		renderDialog({ progress: 0.7 });

		expect(
			screen.getByRole("progressbar", { name: "Enviando imagem" }),
		).toHaveValue(0.7);
		expect(screen.queryByLabelText("Carregar mídia")).toBeNull();
	});

	it("Fechar and Esc close without sending", async () => {
		const { handlers, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Fechar" }));
		await user.keyboard("{Escape}");

		expect(handlers.onClose).toHaveBeenCalledTimes(2);
		expect(handlers.onFile).not.toHaveBeenCalled();
	});
});

describe("CropImageDialog", () => {
	function renderDialog() {
		const handlers = { onSave: vi.fn(), onClose: vi.fn() };
		render(<CropImageDialog url={URL} {...handlers} />);
		return { handlers, user: userEvent.setup() };
	}
	const shape = (name: string) => screen.getByRole("radio", { name });
	const zoom = () => screen.getByRole("slider", { name: "Zoom" });
	const frame = () =>
		document.querySelector("[data-slot=crop-frame]") as HTMLElement;
	const save = () => screen.getByRole("button", { name: "Salvar" });

	it("opens on the widest centered landscape of the original image", async () => {
		const { handlers, user } = renderDialog();

		expect(
			screen.getByRole("dialog", { name: "Recortar imagem" }),
		).toBeInTheDocument();
		for (const name of ["Paisagem", "Retrato", "Quadrado", "Círculo"]) {
			expect(shape(name)).toBeInTheDocument();
		}
		expect(shape("Paisagem")).toBeChecked();
		expect(zoom()).toHaveValue("1");
		expect(frame()).toHaveAttribute("data-shape", "landscape");

		await user.click(save());

		expect(handlers.onSave).toHaveBeenCalledExactlyOnceWith({
			shape: "landscape",
			zoom: 1,
			x: 0.5,
			y: 0.5,
		});
	});

	it("saves a circle", async () => {
		const { handlers, user } = renderDialog();

		await user.click(shape("Círculo"));
		await user.click(save());

		expect(frame()).toHaveStyle({ borderRadius: "50%" });
		expect(handlers.onSave).toHaveBeenCalledExactlyOnceWith({
			shape: "circle",
			zoom: 1,
			x: 0.5,
			y: 0.5,
		});
	});

	it("zooms up to 3 times and moves with the arrow keys", async () => {
		const { handlers, user } = renderDialog();

		fireEvent.change(zoom(), { target: { value: "3" } });
		const stage = screen.getByRole("application", {
			name: "Arraste a imagem para escolher a parte que aparece",
		});
		for (const key of ["ArrowRight", "ArrowRight", "ArrowUp"]) {
			fireEvent.keyDown(stage, { key });
		}
		await user.click(save());

		expect(zoom()).toHaveAttribute("max", "3");
		const saved = handlers.onSave.mock.calls[0]?.[0];
		expect(saved).toMatchObject({ shape: "landscape", zoom: 3 });
		expect(saved.x).toBeCloseTo(0.6);
		expect(saved.y).toBeCloseTo(0.45);
	});

	it("a new shape goes back to the widest centered framing", async () => {
		const { handlers, user } = renderDialog();
		fireEvent.change(zoom(), { target: { value: "2.5" } });

		await user.click(shape("Retrato"));

		expect(zoom()).toHaveValue("1");
		await user.click(save());
		expect(handlers.onSave).toHaveBeenCalledExactlyOnceWith({
			shape: "portrait",
			zoom: 1,
			x: 0.5,
			y: 0.5,
		});
	});

	it("Fechar leaves the image as it was", async () => {
		const { handlers, user } = renderDialog();

		await user.click(shape("Círculo"));
		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(handlers.onSave).not.toHaveBeenCalled();
		expect(handlers.onClose).toHaveBeenCalledOnce();
	});

	it("is closed without an image", () => {
		render(<CropImageDialog url={null} onSave={vi.fn()} onClose={vi.fn()} />);

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

describe("MediaDetailsDialog", () => {
	function renderDialog(altText: string | null = null) {
		const handlers = { onSave: vi.fn(), onClose: vi.fn() };
		render(<MediaDetailsDialog altText={altText} {...handlers} />);
		return { handlers, user: userEvent.setup() };
	}
	const field = () =>
		screen.getByRole("textbox", { name: "Adicionar um texto alternativo" });
	const remaining = () =>
		screen.getByRole("status", {
			name: "Caracteres restantes no texto alternativo",
		});

	it("opens empty with 1000 characters to go", () => {
		renderDialog();

		expect(
			screen.getByRole("dialog", { name: "Adicionar detalhes da mídia" }),
		).toHaveTextContent("Descreva a mídia em 1 ou 2 frases.");
		expect(field()).toHaveValue("");
		expect(remaining()).toHaveTextContent("1000");
	});

	it("saves the trimmed text", async () => {
		const { handlers, user } = renderDialog();

		await user.type(field(), "  Ponte ao pôr do sol ");
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(handlers.onSave).toHaveBeenCalledExactlyOnceWith(
			"Ponte ao pôr do sol",
		);
	});

	it("cuts what is pasted at 1000 characters", () => {
		renderDialog();

		fireEvent.change(field(), { target: { value: "a".repeat(1200) } });

		expect(field()).toHaveValue("a".repeat(1000));
		expect(remaining()).toHaveTextContent("0");
	});

	it("opens with the current text, and clearing it saves no text", async () => {
		const { handlers, user } = renderDialog("Ponte ao pôr do sol");

		expect(field()).toHaveValue("Ponte ao pôr do sol");
		await user.clear(field());
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(handlers.onSave).toHaveBeenCalledExactlyOnceWith(null);
	});

	it("Fechar keeps the text as it was", async () => {
		const { handlers, user } = renderDialog("Ponte");

		await user.type(field(), " nova");
		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(handlers.onSave).not.toHaveBeenCalled();
		expect(handlers.onClose).toHaveBeenCalledOnce();
	});
});

describe("BackgroundNoticeDialog", () => {
	function renderDialog() {
		const onClose = vi.fn();
		render(<BackgroundNoticeDialog open imageUrl={URL} onClose={onClose} />);
		return { onClose, user: userEvent.setup() };
	}

	it("explains what the game hides, without a preview action", () => {
		renderDialog();

		const dialog = screen.getByRole("dialog", {
			name: "Partes do fundo não ficarão visíveis durante o jogo",
		});
		expect(dialog).toHaveTextContent(
			"Elementos do jogo (como caixas de perguntas e respostas) irão obstruir partes do fundo",
		);
		expect(dialog).toHaveTextContent(
			"Alguns dispositivos irão esconder partes do fundo.",
		);
		expect(dialog).toHaveTextContent("Dispositivo móvel");
		expect(dialog).toHaveTextContent("Computador (desktop)");
		expect(screen.queryByRole("button", { name: "Visualizar" })).toBeNull();
	});

	it("Ok closes, keeping the notice for the next time", async () => {
		const { onClose, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("'Não mostrar essa mensagem novamente' dismisses it for good", async () => {
		const { onClose, user } = renderDialog();

		await user.click(
			screen.getByRole("checkbox", {
				name: "Não mostrar essa mensagem novamente",
			}),
		);
		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onClose).toHaveBeenCalledExactlyOnceWith(true);
	});
});
