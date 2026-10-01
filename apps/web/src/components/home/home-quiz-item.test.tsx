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
	hasUnpublishedChanges: false,
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

describe("HomeQuizItem status", () => {
	it.each([
		["a draft", {}, "Rascunho"],
		[
			"a published quiz with changes",
			{ status: "published", hasUnpublishedChanges: true },
			"Alterações não salvas",
		],
	] as const)("shows the status badge of %s", async (_, overrides, label) => {
		renderWithRouter(
			<HomeQuizItem quiz={{ ...quiz, ...overrides }} now={now} />,
		);

		expect(await screen.findByText(label)).toHaveAttribute(
			"data-slot",
			"badge",
		);
	});

	it("a published quiz without changes has no status badge", async () => {
		renderWithRouter(
			<HomeQuizItem quiz={{ ...quiz, status: "published" }} now={now} />,
		);

		await screen.findByRole("link", { name: "Bom de Bíblia (Junho)" });
		expect(screen.queryByText("Rascunho")).toBeNull();
		expect(screen.queryByText("Alterações não salvas")).toBeNull();
		expect(screen.queryByText("Publicado")).toBeNull();
	});
});
