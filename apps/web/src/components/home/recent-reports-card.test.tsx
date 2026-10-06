import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ReportListItemData } from "@/lib/api-types";
import { reportDateLabel } from "@/lib/report-labels";
import { renderWithRouter } from "@/testing/render-with-router";

import { RecentReportsCard } from "./recent-reports-card";

const report = (
	overrides: Partial<ReportListItemData> = {},
): ReportListItemData => ({
	gameId: "game-1",
	name: "Bom de Bíblia (Geral)",
	coverUrl: null,
	questionCount: 15,
	participantCount: 25,
	accuracyPercent: 38,
	endedEarly: false,
	endedAt: "2026-06-13T17:56:00.000Z",
	trashedAt: null,
	quizId: "quiz-1",
	canPlayAgain: true,
	...overrides,
});

describe("RecentReportsCard (spec 015)", () => {
	it("lists the recent reports with name, date and accuracy", async () => {
		renderWithRouter(
			<RecentReportsCard
				state={{
					status: "ready",
					reports: {
						total: 9,
						items: [
							report(),
							report({
								gameId: "game-2",
								name: "Capitais",
								accuracyPercent: null,
							}),
						],
					},
				}}
				onRetry={vi.fn()}
			/>,
		);

		const items = within(
			await screen.findByRole("list", { name: "Relatórios mais recentes" }),
		).getAllByRole("listitem");

		expect(items).toHaveLength(2);
		const first = within(items[0] as HTMLElement);
		expect(
			first.getByRole("link", { name: "Bom de Bíblia (Geral)" }),
		).toHaveAttribute("href", "/reports/game-1");
		expect(
			first.getByText(reportDateLabel("2026-06-13T17:56:00.000Z")),
		).toBeInTheDocument();
		expect(first.getByText("38%")).toBeInTheDocument();
		expect(within(items[1] as HTMLElement).getByText("—")).toBeInTheDocument();
	});

	it("links to all with the total", async () => {
		renderWithRouter(
			<RecentReportsCard
				state={{ status: "ready", reports: { total: 9, items: [report()] } }}
				onRetry={vi.fn()}
			/>,
		);

		expect(
			await screen.findByRole("link", { name: "Ver tudo (9)" }),
		).toHaveAttribute("href", "/reports?section=reports");
	});

	it("explains when there is none, without 'Em breve'", async () => {
		renderWithRouter(
			<RecentReportsCard
				state={{ status: "ready", reports: { total: 0, items: [] } }}
				onRetry={vi.fn()}
			/>,
		);

		expect(
			await screen.findByText("Você ainda não tem relatórios."),
		).toBeInTheDocument();
		expect(
			screen.getByText(/depois de cada partida ao vivo/),
		).toBeInTheDocument();
		expect(screen.queryByText("Em breve")).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Ver tudo/ })).toBeNull();
	});

	it("error state with 'Tentar novamente'", async () => {
		const onRetry = vi.fn();
		renderWithRouter(
			<RecentReportsCard state={{ status: "error" }} onRetry={onRetry} />,
		);

		await userEvent.click(
			await screen.findByRole("button", { name: "Tentar novamente" }),
		);

		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("shows a placeholder while it loads", async () => {
		renderWithRouter(
			<RecentReportsCard state={{ status: "pending" }} onRetry={vi.fn()} />,
		);

		expect(
			await screen.findByRole("status", { name: "Carregando os relatórios" }),
		).toBeInTheDocument();
	});
});
