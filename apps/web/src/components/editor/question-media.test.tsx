import {
	newQuestionImage,
	type QuestionImage,
} from "@quizio/core/quiz/domain/question-image";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dismissBackgroundNotice } from "@/lib/background-notice";

import {
	type ImageUploadState,
	NO_UPLOAD,
	QuestionMedia,
} from "./question-media";

const URL = "https://media.test/media/user-1/ponte.png";
const REJECTED = "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.";

function file(name: string, type: string, size?: number): File {
	const created = new File(["x"], name, { type });
	if (size !== undefined) {
		Object.defineProperty(created, "size", { value: size });
	}
	return created;
}

function renderMedia({
	image = null,
	upload = NO_UPLOAD,
}: {
	image?: QuestionImage | null;
	upload?: ImageUploadState;
} = {}) {
	const handlers = { onUpload: vi.fn(), onChange: vi.fn() };
	render(
		<QuestionMedia
			image={image}
			url={image ? URL : null}
			upload={upload}
			{...handlers}
		/>,
	);
	// Refused files must reach the component, so `accept` is not applied here.
	return { handlers, user: userEvent.setup({ applyAccept: false }) };
}

const area = () => screen.getByRole("region", { name: "Mídia" });
const fileInput = () => screen.getByLabelText("Carregar arquivo");
const drop = (...files: File[]) =>
	fireEvent.drop(area(), { dataTransfer: { files } });

describe("QuestionMedia", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	describe("without an image", () => {
		it("shows the ways to insert one, without 'Em breve'", () => {
			renderMedia();

			expect(
				within(area()).getByRole("button", { name: "Inserir mídia" }),
			).toBeInTheDocument();
			expect(area()).toHaveTextContent("Encontre e insira mídia");
			expect(area()).toHaveTextContent(
				"Carregar arquivo ou arraste aqui para fazer upload",
			);
			expect(screen.queryByText("Em breve")).toBeNull();
		});

		it("'Carregar arquivo' sends the chosen file", async () => {
			const { handlers, user } = renderMedia();
			const png = file("ponte.png", "image/png");

			await user.upload(fileInput(), png);

			expect(handlers.onUpload).toHaveBeenCalledExactlyOnceWith(png);
		});

		it("a file dropped on the area is sent", () => {
			const { handlers } = renderMedia();
			const jpeg = file("ponte.jpg", "image/jpeg");

			drop(jpeg);

			expect(handlers.onUpload).toHaveBeenCalledExactlyOnceWith(jpeg);
		});

		it.each([
			["an SVG", file("a.svg", "image/svg+xml")],
			["a PDF", file("a.pdf", "application/pdf")],
			["an image of 10.1 MB", file("a.png", "image/png", 10.1 * 1024 * 1024)],
		])("refuses %s before sending", (_name, refused) => {
			const { handlers } = renderMedia();

			drop(refused);

			expect(screen.getByRole("alert")).toHaveTextContent(REJECTED);
			expect(handlers.onUpload).not.toHaveBeenCalled();
		});

		it("accepts an image of exactly 10 MB", () => {
			const { handlers } = renderMedia();

			drop(file("a.png", "image/png", 10 * 1024 * 1024));

			expect(handlers.onUpload).toHaveBeenCalledOnce();
			expect(screen.queryByRole("alert")).toBeNull();
		});

		it("of several files, sends only the first accepted image", () => {
			const { handlers } = renderMedia();
			const first = file("um.png", "image/png");

			drop(
				file("doc.pdf", "application/pdf"),
				first,
				file("dois.png", "image/png"),
			);

			expect(handlers.onUpload).toHaveBeenCalledExactlyOnceWith(first);
		});

		it("shows the progress while sending and takes no other file", () => {
			const { handlers } = renderMedia({
				upload: { progress: 0.4, error: null },
			});

			drop(file("outra.png", "image/png"));

			expect(
				screen.getByRole("progressbar", { name: "Enviando imagem" }),
			).toHaveValue(0.4);
			expect(
				screen.queryByRole("button", { name: "Inserir mídia" }),
			).toBeNull();
			expect(handlers.onUpload).not.toHaveBeenCalled();
		});

		it("tells why an upload failed and is ready for another try", () => {
			renderMedia({
				upload: {
					progress: null,
					error: "Não foi possível enviar a imagem. Tente de novo.",
				},
			});

			expect(screen.getByRole("alert")).toHaveTextContent(
				"Não foi possível enviar a imagem. Tente de novo.",
			);
			expect(fileInput()).toBeInTheDocument();
		});

		it("'+' opens 'Carregar imagem', which sends the picked file", async () => {
			const { handlers, user } = renderMedia();
			const png = file("ponte.png", "image/png");

			await user.click(screen.getByRole("button", { name: "Inserir mídia" }));
			const dialog = await screen.findByRole("dialog", {
				name: "Carregar imagem",
			});
			await user.upload(within(dialog).getByLabelText("Carregar mídia"), png);

			expect(handlers.onUpload).toHaveBeenCalledExactlyOnceWith(png);
		});
	});

	describe("with an image in the middle", () => {
		const image = newQuestionImage("media/user-1/ponte.png");

		it("shows the whole image and its four actions", () => {
			renderMedia({ image });

			expect(
				screen.getByRole("img", { name: "Imagem da pergunta" }),
			).toHaveAttribute("src", URL);
			expect(
				area().querySelector("[data-slot=question-image]"),
			).toHaveAttribute("data-crop", "none");
			for (const name of [
				"Usar como fundo",
				"Editar recorte de imagem",
				"Detalhes da mídia",
				"Remover imagem",
			]) {
				expect(screen.getByRole("button", { name })).toBeInTheDocument();
			}
		});

		it("announces the alt text when there is one", () => {
			renderMedia({ image: { ...image, altText: "Ponte ao pôr do sol" } });

			expect(
				screen.getByRole("img", { name: "Ponte ao pôr do sol" }),
			).toBeInTheDocument();
		});

		it("shows a cropped image in its shape", () => {
			renderMedia({
				image: {
					...image,
					crop: { shape: "circle", zoom: 2, x: 0.25, y: 0.5 },
				},
			});

			expect(
				area().querySelector("[data-slot=question-image]"),
			).toHaveAttribute("data-crop", "circle");
			expect(screen.getByRole("img")).toHaveStyle({
				objectPosition: "25% 50%",
				transform: "scale(2)",
			});
		});

		it("Remover takes the image out at once", async () => {
			const { handlers, user } = renderMedia({ image });

			await user.click(screen.getByRole("button", { name: "Remover imagem" }));

			expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
				kind: "image",
				key: null,
			});
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("does not take a file dropped over the image", () => {
			const { handlers } = renderMedia({ image });

			drop(file("outra.png", "image/png"));

			expect(handlers.onUpload).not.toHaveBeenCalled();
			expect(handlers.onChange).not.toHaveBeenCalled();
		});

		it("crops through 'Recortar imagem'", async () => {
			const { handlers, user } = renderMedia({ image });

			await user.click(
				screen.getByRole("button", { name: "Editar recorte de imagem" }),
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Recortar imagem",
			});
			await user.click(within(dialog).getByRole("radio", { name: "Quadrado" }));
			await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

			expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
				kind: "imageCrop",
				crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
			});
		});

		it("describes through 'Detalhes da mídia'", async () => {
			const { handlers, user } = renderMedia({ image });

			await user.click(
				screen.getByRole("button", { name: "Detalhes da mídia" }),
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Adicionar detalhes da mídia",
			});
			await user.type(
				within(dialog).getByRole("textbox", {
					name: "Adicionar um texto alternativo",
				}),
				"Ponte ao pôr do sol",
			);
			await user.click(
				within(dialog).getByRole("button", { name: "Adicionar" }),
			);

			expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
				kind: "imageAltText",
				altText: "Ponte ao pôr do sol",
			});
		});

		it("'Usar como fundo' moves the image and warns about the game", async () => {
			const { handlers, user } = renderMedia({ image });

			await user.click(screen.getByRole("button", { name: "Usar como fundo" }));

			expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
				kind: "imagePlacement",
				placement: "background",
			});
			expect(
				await screen.findByRole("dialog", {
					name: "Partes do fundo não ficarão visíveis durante o jogo",
				}),
			).toBeInTheDocument();
		});

		it("does not warn again once dismissed for good", async () => {
			dismissBackgroundNotice();
			const { handlers, user } = renderMedia({ image });

			await user.click(screen.getByRole("button", { name: "Usar como fundo" }));

			expect(handlers.onChange).toHaveBeenCalledOnce();
			expect(screen.queryByRole("dialog")).toBeNull();
		});
	});

	describe("with the image as background", () => {
		const image: QuestionImage = {
			...newQuestionImage("media/user-1/ponte.png"),
			placement: "background",
			crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
		};

		it("keeps only the actions, without crop or any paid-feature notice", () => {
			renderMedia({ image });

			expect(screen.queryByRole("img")).toBeNull();
			expect(
				screen.getByRole("button", { name: "Usar como mídia" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Editar recorte de imagem" }),
			).toBeNull();
			expect(
				screen.getByRole("button", { name: "Detalhes da mídia" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Remover imagem" }),
			).toBeInTheDocument();
			expect(area()).not.toHaveTextContent(/premium|assinatura|upgrade/i);
		});

		it("'Usar como mídia' brings it back, without the notice", async () => {
			const { handlers, user } = renderMedia({ image });

			await user.click(screen.getByRole("button", { name: "Usar como mídia" }));

			expect(handlers.onChange).toHaveBeenCalledExactlyOnceWith({
				kind: "imagePlacement",
				placement: "media",
			});
			expect(screen.queryByRole("dialog")).toBeNull();
		});
	});
});
