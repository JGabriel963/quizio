import {
	aQuestion,
	aTrueFalseQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { shownTheme } from "@/lib/theme-catalog";

import { QuizQuestionPreview } from "./quiz-question-preview";

const capital = aQuestion({
	id: "q1",
	choices: [
		{ id: "c1", text: "Rio", correct: false },
		{ id: "c2", text: "Brasília", correct: true },
		{ id: "c3", text: null, correct: false },
		{ id: "c4", text: null, correct: false },
	],
});
const trueFalse = aTrueFalseQuestion({ id: "q2", correct: true });

describe("QuizQuestionPreview", () => {
	it("draws each slide with its text and colored answers, without their texts while hidden", () => {
		render(
			<QuizQuestionPreview
				questions={[capital, trueFalse]}
				imageUrls={{}}
				layout="grid"
				showAnswers={false}
			/>,
		);

		const slides = screen
			.getAllByRole("listitem")
			.filter((item) => item.matches("[data-slot=question-slide]"));
		expect(slides).toHaveLength(2);
		expect(
			within(slides[0] as HTMLElement).getByText("Qual é a capital do Brasil?"),
		).toBeInTheDocument();
		expect(screen.queryByText("Brasília")).toBeNull();
		expect(screen.queryByText("Verdadeiro")).toBeNull();
	});

	it("shows the answers and marks the right ones with Mostrar respostas", () => {
		render(
			<QuizQuestionPreview
				questions={[capital, trueFalse]}
				imageUrls={{}}
				layout="grid"
				showAnswers
			/>,
		);

		const [quizAnswers, trueFalseAnswers] = screen.getAllByRole("list", {
			name: "Respostas",
		});
		expect(
			within(quizAnswers as HTMLElement)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Rio", "Brasília(correta)"]);
		expect(
			within(trueFalseAnswers as HTMLElement)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Verdadeiro(correta)", "Falso"]);
	});

	it("the list layout tells the number, type and time of each question", () => {
		render(
			<QuizQuestionPreview
				questions={[capital]}
				imageUrls={{}}
				layout="list"
				showAnswers={false}
			/>,
		);

		expect(screen.getByText(/^1 · Quiz ·/)).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Respostas" })).toBeNull();
	});

	it("a row of the list opens its own answers", async () => {
		render(
			<QuizQuestionPreview
				questions={[capital]}
				imageUrls={{}}
				layout="list"
				showAnswers={false}
			/>,
		);

		const toggle = screen.getByRole("button", {
			name: "Respostas da pergunta 1",
		});
		await userEvent.setup().click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("list", { name: "Respostas" })).toBeInTheDocument();
	});

	it("draws the slides and the list's thumbnails with the quiz's theme", () => {
		const { rerender } = render(
			<QuizQuestionPreview
				questions={[capital]}
				imageUrls={{}}
				layout="grid"
				showAnswers={false}
				theme={shownTheme("teal", null)}
			/>,
		);

		const slide = () =>
			document.querySelector("[data-slot=question-slide]") as HTMLElement;
		expect(slide()).toHaveAttribute("data-theme", "teal");
		expect(slide().style.getPropertyValue("--game-bg-image")).toContain(
			"/themes/teal.svg",
		);

		rerender(
			<QuizQuestionPreview
				questions={[capital]}
				imageUrls={{}}
				layout="list"
				showAnswers={false}
				theme={shownTheme("standard", {
					pattern: null,
					backgroundColor: null,
					imageUrl: "https://cdn.test/themes/u1/bg.webp",
					imageTone: "dark",
					accentColor: "#ff0000",
					logoUrl: null,
				})}
			/>,
		);

		const thumbnail = document.querySelector(
			"[data-slot=question-thumbnail]",
		) as HTMLElement;
		expect(thumbnail).toHaveAttribute("data-theme", "custom");
		expect(thumbnail.style.getPropertyValue("--game-bg-image")).toContain(
			"https://cdn.test/themes/u1/bg.webp",
		);
	});
});
