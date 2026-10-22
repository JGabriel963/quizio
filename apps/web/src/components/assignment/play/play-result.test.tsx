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
						text: "Quem andou sobre as águas?",
						image: null,
						choices: [],
					},
					chosenIds: [],
					rightIds: [],
					typedText: "pedra",
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
