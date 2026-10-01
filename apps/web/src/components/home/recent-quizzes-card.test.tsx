import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	RecentQuizzesCard,
	type RecentQuizzesState,
} from "@/components/home/recent-quizzes-card";
import { CreateQuizContext } from "@/components/layout/create-quiz-context";
import type { HomeQuizView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

const now = new Date("2026-06-15T12:00:00.000Z");

const aQuiz = (id: string, title: string): HomeQuizView => ({
	id,
	title,
	coverImageUrl: null,
	visibility: "private",
	status: "draft",
	hasUnpublishedChanges: false,
	questionCount: 0,
	updatedAt: "2026-06-14T12:00:00.000Z",
	trashedAt: null,
});

function renderCard(state: RecentQuizzesState) {
	const createQuiz = vi.fn();
	const onRetry = vi.fn();
	renderWithRouter(
		<CreateQuizContext value={{ createQuiz, creating: false }}>
			<RecentQuizzesCard state={state} onRetry={onRetry} now={now} />
		</CreateQuizContext>,
	);
	return { createQuiz, onRetry, user: userEvent.setup() };
}

describe("RecentQuizzesCard", () => {
	it("lists the quizzes with a see all link carrying the total", async () => {
		renderCard({
			status: "ready",
			overview: {
				quizzes: [aQuiz("a", "Bom de Bíblia"), aQuiz("b", "Geografia")],
				totalQuizCount: 8,
			},
		});

		const list = await screen.findByRole("list", { name: "Seus quizzes" });
		expect(within(list).getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByRole("link", { name: "Ver tudo (8)" })).toHaveAttribute(
			"href",
			"/library?section=recent",
		);
	});

	it("offers creating the first quiz when the creator has none", async () => {
		const { createQuiz, user } = renderCard({
			status: "ready",
			overview: { quizzes: [], totalQuizCount: 0 },
		});

		await user.click(
			await screen.findByRole("button", { name: "Criar meu primeiro quiz" }),
		);

		expect(createQuiz).toHaveBeenCalledOnce();
		expect(screen.queryByRole("list", { name: "Seus quizzes" })).toBeNull();
	});

	it("shows placeholders while loading", async () => {
		renderCard({ status: "pending" });

		expect(
			await screen.findByRole("status", { name: "Carregando seus quizzes" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Seus quizzes" })).toBeNull();
	});

	it("shows an error with a retry action", async () => {
		const { onRetry, user } = renderCard({ status: "error" });

		await user.click(
			await screen.findByRole("button", { name: "Tentar novamente" }),
		);

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
