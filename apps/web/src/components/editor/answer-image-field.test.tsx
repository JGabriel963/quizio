import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnswerImageField } from "./answer-image-field";

const URL = "https://media.test/media/user-1/arroz.png";

function renderField(altText: string | null = null) {
	const handlers = { onRemove: vi.fn(), onCrop: vi.fn(), onAltText: vi.fn() };
	render(
		<AnswerImageField
			image={{ key: "media/user-1/arroz.png", crop: null, altText }}
			url={URL}
			label="Resposta 1"
			{...handlers}
		/>,
	);
	return { handlers, user: userEvent.setup() };
}

describe("AnswerImageField (spec 049)", () => {
	it("shows the image, named by the alt text or the answer, and its three actions", () => {
		renderField();

		expect(
			screen.getByRole("img", { name: "Imagem da resposta 1" }),
		).toHaveAttribute("src", URL);
		for (const name of [
			"Remover imagem da resposta 1",
			"Recortar imagem da resposta 1",
			"Detalhes da mídia da resposta 1",
		]) {
			expect(screen.getByRole("button", { name })).toBeInTheDocument();
		}
	});

	it("Remover removes the image", async () => {
		const { handlers, user } = renderField();

		await user.click(
			screen.getByRole("button", { name: "Remover imagem da resposta 1" }),
		);

		expect(handlers.onRemove).toHaveBeenCalledOnce();
	});

	it("Detalhes da mídia saves the alt text", async () => {
		const { handlers, user } = renderField();

		await user.click(
			screen.getByRole("button", { name: "Detalhes da mídia da resposta 1" }),
		);
		await user.type(
			screen.getByRole("textbox", { name: "Adicionar um texto alternativo" }),
			"Arroz",
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));

		expect(handlers.onAltText).toHaveBeenCalledExactlyOnceWith("Arroz");
	});

	it("Recortar saves the crop, without the circle", async () => {
		const { handlers, user } = renderField();

		await user.click(
			screen.getByRole("button", { name: "Recortar imagem da resposta 1" }),
		);
		expect(screen.queryByRole("radio", { name: "Círculo" })).toBeNull();
		await user.click(screen.getByRole("radio", { name: "Quadrado" }));
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(handlers.onCrop).toHaveBeenCalledExactlyOnceWith({
			shape: "square",
			zoom: 1,
			x: 0.5,
			y: 0.5,
		});
	});
});
