import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlayResult } from "./play-result";

describe("PlayResult of a type answer (spec 031, RN-35)", () => {
	it("a type answer shows the typed text and the accepted answers", () => {
		render(
			<PlayResult
				animate={false}
				questionCount={5}
				result={{
					question: {
						index: 0,
						type: "typeAnswer",
						selection: "single",
						slider: null,
						text: "Quem andou sobre as águas?",
						image: null,
						choices: [],
					},
					chosenIds: [],
					rightIds: [],
					typedText: "pedra",
					sliderValue: null,
					sliderAnswer: null,
					acceptedAnswers: ["Pedro", "Simão Pedro"],
					result: "wrong",
					points: 0,
				}}
			/>,
		);

		expect(screen.getByText("Sua resposta:").parentElement).toHaveTextContent(
			"pedra",
		);
		expect(
			screen.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeInTheDocument();
		expect(screen.getByText("Simão Pedro")).toBeInTheDocument();
	});
});

describe("PlayResult of a slider (spec 032, RN-34)", () => {
	it("a slider result shows the value sent, the answer and the margin", () => {
		render(
			<PlayResult
				animate={false}
				questionCount={5}
				result={{
					question: {
						index: 0,
						type: "slider",
						selection: "single",
						slider: {
							min: 100,
							max: 900,
							first: 104,
							last: 896,
							step: 8,
							start: 496,
							unit: "anos",
						},
						text: "Quantos anos?",
						image: null,
						choices: [],
					},
					chosenIds: [],
					rightIds: [],
					typedText: null,
					sliderValue: 640,
					sliderAnswer: { answer: 600, low: 520, high: 680, unit: "anos" },
					acceptedAnswers: [],
					result: "almostCorrect",
					points: 600,
				}}
			/>,
		);

		// A right answer seen again shows its points in the strip at once.
		expect(document.querySelector("[data-slot=result-strip]")).toHaveClass(
			"bg-answer-yellow",
		);
		expect(screen.getByText("Sua resposta:").parentElement).toHaveTextContent(
			"640 anos",
		);
		expect(
			screen.getByRole("heading", { name: "A resposta correta é:" }),
		).toBeInTheDocument();
		expect(screen.getByText("600 anos")).toBeInTheDocument();
		expect(
			screen.getByText(/Margem de resposta: 520 anos a 680 anos/),
		).toBeInTheDocument();
	});
});
