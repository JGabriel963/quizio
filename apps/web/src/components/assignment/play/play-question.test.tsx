import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlayQuestion } from "./play-question";
import { PlayResult } from "./play-result";

const question = {
	index: 0,
	type: "quiz" as const,
	selection: "single" as const,
	text: "Qual é a capital do Brasil?",
	image: {
		url: "https://media.test/rio.png",
		placement: "media" as const,
		crop: null,
		altText: "Cristo Redentor",
	},
	choices: [
		{ id: "choice-1", shapeIndex: 0, text: "Brasília" },
		{ id: "choice-2", shapeIndex: 1, text: "Rio de Janeiro" },
		{ id: "choice-3", shapeIndex: 2, text: "Salvador" },
		{ id: "choice-4", shapeIndex: 3, text: "Recife" },
	],
};

function renderQuestion(
	overrides: Partial<React.ComponentProps<typeof PlayQuestion>> = {},
) {
	const props = {
		question,
		questionCount: 5,
		remainingMs: 15_000,
		durationMs: 20_000,
		receivedAt: Date.now(),
		failure: null,
		onAnswer: vi.fn(),
		...overrides,
	};
	render(<PlayQuestion {...props} />);
	return { props, user: userEvent.setup() };
}

describe("PlayQuestion (spec 030, RN-08, RN-09)", () => {
	it("shows the progress, the image, the statement and the answers with shape and text", async () => {
		const { props, user } = renderQuestion();

		expect(
			screen.getByRole("progressbar", { name: "Pergunta 1 de 5" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "Cristo Redentor" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Qual é a capital do Brasil?" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /Brasília/ }));

		expect(props.onAnswer).toHaveBeenCalledWith(["choice-1"]);
	});

	it("the time bar counts down from what the server sent", () => {
		renderQuestion();

		expect(
			screen.getByRole("timer", { name: "Tempo restante" }),
		).toHaveTextContent("15");
	});

	it("without the timer there is no bar", () => {
		renderQuestion({ remainingMs: null, durationMs: null });

		expect(screen.queryByRole("timer")).toBeNull();
	});

	it("multiple selection marks and Enviar", async () => {
		const { props, user } = renderQuestion({
			question: { ...question, selection: "multiple" },
		});

		await user.click(screen.getByRole("button", { name: /Salvador/ }));
		await user.click(screen.getByRole("button", { name: /Brasília/ }));
		await user.click(screen.getByRole("button", { name: "Enviar" }));

		expect(props.onAnswer).toHaveBeenCalledWith(["choice-1", "choice-3"]);
	});

	it("an answer that got no reply says so and gives the answers back", () => {
		renderQuestion({ failure: "Sua resposta não foi enviada." });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Sua resposta não foi enviada.",
		);
		expect(screen.getByRole("button", { name: /Brasília/ })).toBeEnabled();
	});
});

describe("PlayResult (spec 030, RN-11)", () => {
	const result = (
		overrides: Partial<React.ComponentProps<typeof PlayResult>["result"]> = {},
	) => ({
		question,
		chosenIds: ["choice-1"],
		rightIds: ["choice-1"],
		result: "correct" as const,
		points: 950,
		...overrides,
	});

	it("Correto then the points", async () => {
		render(<PlayResult result={result()} questionCount={5} />);

		expect(screen.getByText("Correto")).toBeInTheDocument();
		expect(
			await screen.findByText("+ 950", {}, { timeout: 3000 }),
		).toBeInTheDocument();
	});

	it("Incorreto with the chosen and the right one marked", () => {
		render(
			<PlayResult
				result={result({ chosenIds: ["choice-2"], result: "wrong", points: 0 })}
				questionCount={5}
			/>,
		);

		expect(screen.getByText("Incorreto")).toBeInTheDocument();
		const answers = screen.getByRole("list", { name: "Respostas" });
		expect(
			within(answers).getByText("Brasília").closest("li"),
		).toHaveTextContent("Correta");
		expect(
			within(answers).getByText("Rio de Janeiro").closest("li"),
		).toHaveTextContent("Sua resposta");
	});

	it("Tempo esgotado without an answer", () => {
		render(
			<PlayResult
				result={result({ chosenIds: [], result: "unanswered", points: 0 })}
				questionCount={5}
			/>,
		);

		expect(screen.getByText("Tempo esgotado")).toBeInTheDocument();
	});
});
