import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnswerContent, AnswerImage, answerImageLabel } from "./answer-image";

const url = "https://media.test/media/ana/arroz.png";

describe("AnswerImage (spec 049, RN-09, RN-25)", () => {
	it("draws the whole image without a crop", () => {
		render(
			<AnswerImage
				image={{ url, crop: null, altText: null }}
				label={answerImageLabel(0)}
			/>,
		);

		const image = screen.getByRole("img", { name: "Imagem da resposta 1" });
		expect(image).toHaveAttribute("src", url);
		expect(image.closest("[data-slot=answer-image]")).toHaveAttribute(
			"data-crop",
			"none",
		);
	});

	it("draws the cropped part", () => {
		render(
			<AnswerImage
				image={{
					url,
					crop: { shape: "portrait", zoom: 2, x: 0.5, y: 0 },
					altText: "Arroz",
				}}
				label={answerImageLabel(0)}
			/>,
		);

		const image = screen.getByRole("img", { name: "Arroz" });
		expect(image.style.transform).toBe("scale(2)");
		expect(image.closest("[data-slot=answer-image]")).toHaveAttribute(
			"data-crop",
			"portrait",
		);
	});

	it("is named by its alt text, or the label, also without an address", () => {
		render(
			<AnswerImage
				image={{ url: null, crop: null, altText: "Arroz" }}
				label={answerImageLabel(2)}
			/>,
		);

		expect(screen.getByRole("img", { name: "Arroz" })).not.toHaveAttribute(
			"src",
		);
	});

	it("AnswerContent draws the text, or the image when there is one", () => {
		const { rerender } = render(
			<AnswerContent
				answer={{ text: "Feijão", textFormatting: {}, image: null }}
				index={1}
			/>,
		);
		expect(screen.getByText("Feijão")).toBeInTheDocument();

		rerender(
			<AnswerContent
				answer={{
					text: null,
					textFormatting: {},
					image: { url, crop: null, altText: null },
				}}
				index={1}
			/>,
		);
		expect(
			screen.getByRole("img", { name: "Imagem da resposta 2" }),
		).toBeInTheDocument();
	});
});
