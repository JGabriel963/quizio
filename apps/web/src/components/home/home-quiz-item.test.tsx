import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeQuizItem } from "@/components/home/home-quiz-item";
import type { HomeQuizView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

const now = new Date("2026-06-15T12:00:00.000Z");

const quiz: HomeQuizView = {
	id: "quiz-1",
	title: "Bom de Bíblia (Junho)",
	coverImageUrl: null,
	visibility: "private",
	status: "draft",
	questionCount: 0,
	updatedAt: "2026-04-15T12:00:00.000Z",
	trashedAt: null,
};

describe("HomeQuizItem", () => {
	it("shows the untitled label, the default cover, the question count and the relative time", async () => {
		renderWithRouter(
			<HomeQuizItem quiz={{ ...quiz, title: null }} now={now} />,
		);

		expect(
			await screen.findByRole("link", { name: "Quiz sem título" }),
		).toBeInTheDocument();
		expect(screen.getByText("0 perguntas")).toBeInTheDocument();
		expect(screen.getByText("há 2 meses")).toBeInTheDocument();
	});

	it("links to the quiz page", async () => {
		renderWithRouter(<HomeQuizItem quiz={quiz} now={now} />);

		expect(
			await screen.findByRole("link", { name: "Bom de Bíblia (Junho)" }),
		).toHaveAttribute("href", "/quizzes/quiz-1");
	});

	it("offers no quiz actions: those stay in the library", async () => {
		renderWithRouter(<HomeQuizItem quiz={quiz} now={now} />);

		await screen.findByRole("link", { name: "Bom de Bíblia (Junho)" });
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
