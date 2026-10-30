import {
	aFormattedAnswersQuestion,
	anImageAnswersQuestion,
	aPuzzleQuestion,
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
		{ id: "c1", text: "Rio", textFormatting: {}, image: null, correct: false },
		{
			id: "c2",
			text: "Brasília",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{ id: "c3", text: null, textFormatting: {}, image: null, correct: false },
		{ id: "c4", text: null, textFormatting: {}, image: null, correct: false },
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

	it("slide and row show the statement formatted, in normal weight (spec 047)", () => {
		const formatted = aQuestion({
			id: "q3",
			text: "Qual destas não é uma capital?",
			textFormatting: { bold: [[12, 15]] },
		});
		const { rerender } = render(
			<QuizQuestionPreview
				questions={[formatted]}
				imageUrls={{}}
				layout="grid"
				showAnswers={false}
			/>,
		);
		expect(document.querySelector("strong")).toHaveTextContent("não");
		expect(document.querySelector("strong")?.parentElement).toHaveClass(
			"font-normal",
		);

		rerender(
			<QuizQuestionPreview
				questions={[formatted]}
				imageUrls={{}}
				layout="list"
				showAnswers={false}
			/>,
		);
		expect(document.querySelector("strong")).toHaveTextContent("não");
	});

	it("draws the answers formatted, in normal weight (spec 048, RN-18)", () => {
		const water = aFormattedAnswersQuestion({ id: "q4" });
		const puzzle = aPuzzleQuestion({
			id: "q5",
			items: ["H2O", "Sal", "Ar", null],
			itemFormatting: [{ subscript: [[1, 2]] }, {}, {}, {}],
		});

		for (const layout of ["large", "grid", "list"] as const) {
			const { unmount } = render(
				<QuizQuestionPreview
					questions={[water, puzzle]}
					imageUrls={{}}
					layout={layout}
					showAnswers
				/>,
			);
			const subs = document.querySelectorAll("sub");
			expect(subs.length).toBeGreaterThanOrEqual(2);
			for (const sub of subs) {
				expect(sub).toHaveTextContent("2");
				expect(sub.parentElement).toHaveClass("font-normal");
			}
			unmount();
		}
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

describe("QuizQuestionPreview with image answers (spec 049, RN-24)", () => {
	it("an image answer shows as a thumbnail with the answers shown", () => {
		render(
			<QuizQuestionPreview
				questions={[anImageAnswersQuestion({ id: "q1" })]}
				imageUrls={{
					"media/user-1/arroz.png": "https://media.test/media/user-1/arroz.png",
				}}
				layout="large"
				showAnswers
			/>,
		);

		expect(screen.getByRole("img", { name: "Arroz" })).toHaveAttribute(
			"src",
			"https://media.test/media/user-1/arroz.png",
		);
		expect(screen.getByText("Feijão")).toBeInTheDocument();
	});
});
