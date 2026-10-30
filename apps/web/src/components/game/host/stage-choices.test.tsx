import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StageChoices } from "./stage-choices";

describe("StageChoices with image answers (spec 049, RN-22)", () => {
	it("draws the answer images, cropped, in the answers and the results", () => {
		const choices = [
			{
				id: "choice-1",
				shapeIndex: 0,
				text: null,
				textFormatting: {},
				image: {
					url: "https://media.test/media/ana/arroz.png",
					crop: { shape: "square" as const, zoom: 2, x: 0.5, y: 0.5 },
					altText: null,
				},
				correct: true,
			},
			{
				id: "choice-2",
				shapeIndex: 1,
				text: "Feijão",
				textFormatting: {},
				image: null,
				correct: false,
			},
		];

		render(<StageChoices choices={choices} />);

		const image = screen.getByRole("img", { name: "Imagem da resposta 1" });
		expect(image.closest("[data-slot=answer-image]")).toHaveAttribute(
			"data-crop",
			"square",
		);
		expect(screen.getByText("Feijão")).toBeInTheDocument();
		expect(screen.getByText("Resposta correta")).toBeInTheDocument();
	});
});
