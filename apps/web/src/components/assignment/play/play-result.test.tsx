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
					rightOrder: [],
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
					rightOrder: [],
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

describe("PlayResult of a puzzle (spec 033, RN-29)", () => {
	const puzzleQuestion = {
		index: 0,
		type: "puzzle" as const,
		selection: "single" as const,
		slider: null,
		text: "Coloque estes rios do maior para o menor",
		image: null,
		choices: [
			{ id: "choice-3", shapeIndex: 0, text: "Yangtzé" },
			{ id: "choice-4", shapeIndex: 1, text: "Mississipi" },
			{ id: "choice-1", shapeIndex: 2, text: "Nilo" },
			{ id: "choice-2", shapeIndex: 3, text: "Amazonas" },
		],
	};

	it("a puzzle result shows the sent and the right order", () => {
		render(
			<PlayResult
				animate={false}
				questionCount={5}
				result={{
					question: puzzleQuestion,
					chosenIds: ["choice-2", "choice-1", "choice-3", "choice-4"],
					rightIds: [],
					typedText: null,
					sliderValue: null,
					sliderAnswer: null,
					rightOrder: ["choice-1", "choice-2", "choice-3", "choice-4"],
					acceptedAnswers: [],
					result: "wrong",
					points: 0,
				}}
			/>,
		);

		const texts = (name: string) =>
			[
				...screen
					.getByRole("list", { name })
					.querySelectorAll("[data-slot=puzzle-block]"),
			].map((block) => block.textContent);
		expect(texts("Sua ordem")).toEqual([
			"Amazonas",
			"Nilo",
			"Yangtzé",
			"Mississipi",
		]);
		expect(
			screen.getByRole("heading", { name: "A ordem certa é:" }),
		).toBeInTheDocument();
		expect(texts("A ordem certa é:")).toEqual([
			"Nilo",
			"Amazonas",
			"Yangtzé",
			"Mississipi",
		]);
	});

	it("without an answer only the right order shows", () => {
		render(
			<PlayResult
				animate={false}
				questionCount={5}
				result={{
					question: puzzleQuestion,
					chosenIds: [],
					rightIds: [],
					typedText: null,
					sliderValue: null,
					sliderAnswer: null,
					rightOrder: ["choice-1", "choice-2", "choice-3", "choice-4"],
					acceptedAnswers: [],
					result: "unanswered",
					points: 0,
				}}
			/>,
		);

		expect(screen.queryByRole("list", { name: "Sua ordem" })).toBeNull();
		expect(
			screen.getByRole("list", { name: "A ordem certa é:" }),
		).toBeInTheDocument();
	});
});
