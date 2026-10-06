import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
	ReportHeaderData,
	ReportParticipantData,
	ReportSummaryData,
} from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { ReportSummary } from "./report-summary";

const header = (
	overrides: Partial<ReportHeaderData> = {},
): ReportHeaderData => ({
	gameId: "game-1",
	name: "Bom de Bíblia (Geral)",
	coverUrl: null,
	startedAt: "2026-06-13T17:45:00.000Z",
	endedAt: "2026-06-13T17:56:00.000Z",
	endedEarly: false,
	questionCount: 15,
	playedCount: 15,
	participantCount: 25,
	quizId: "quiz-1",
	canPlayAgain: true,
	...overrides,
});

const participant = (
	nickname: string,
	overrides: Partial<ReportParticipantData> = {},
): ReportParticipantData => ({
	playerId: `player-${nickname}`,
	nickname,
	rank: 20,
	total: 0,
	accuracyPercent: 0,
	unanswered: 0,
	needsHelp: true,
	...overrides,
});

const summary = (
	overrides: Partial<ReportSummaryData> = {},
): ReportSummaryData => ({
	accuracyPercent: 38,
	durationMs: 11 * 60_000,
	hardestQuestion: {
		index: 14,
		text: "Quem escreveu o Salmo 90?",
		type: "quiz",
		accuracyPercent: 16,
		difficult: true,
		imageUrl: "https://media.test/salmo.png",
		averageResponseTimeMs: 4860,
	},
	difficultCount: 6,
	needsHelp: ["Sete", "Bia C", "Muela", "Davi", "Eva", "Fábio", "Gil"].map(
		(nickname) => participant(nickname),
	),
	didNotFinish: [],
	...overrides,
});

function renderSummary(
	props: {
		header?: Partial<ReportHeaderData>;
		summary?: Partial<ReportSummaryData>;
		playAgain?: Partial<Parameters<typeof ReportSummary>[0]["playAgain"]>;
	} = {},
) {
	const start = vi.fn();
	renderWithRouter(
		<ReportSummary
			header={header(props.header)}
			summary={summary(props.summary)}
			playAgain={{ start, pending: false, error: null, ...props.playAgain }}
		/>,
	);
	return { start };
}

const section = async (name: RegExp | string) =>
	within(
		(await screen.findByRole("heading", { name })).closest(
			"section",
		) as HTMLElement,
	);

describe("ReportSummary (spec 015)", () => {
	it("draws the five cards", async () => {
		const { start } = renderSummary();

		const overall = within(
			await screen.findByRole("region", { name: "Resultado geral" }),
		);
		expect(overall.getByText("38%")).toBeInTheDocument();
		expect(overall.getByText("correto")).toBeInTheDocument();
		expect(
			overall.getByRole("heading", { name: "A prática leva à perfeição!" }),
		).toBeInTheDocument();
		await userEvent.click(
			overall.getByRole("button", { name: "Jogar de novo" }),
		);
		expect(start).toHaveBeenCalledOnce();

		const totals = within(screen.getByRole("region", { name: "Totais" }));
		expect(totals.getByText("Participantes").nextSibling).toHaveTextContent(
			"25",
		);
		expect(totals.getByText("Perguntas").nextSibling).toHaveTextContent("15");
		expect(totals.getByText("Tempo").nextSibling).toHaveTextContent("11 min");

		const difficult = await section("Perguntas difíceis (6)");
		expect(difficult.getByText("15 - Quiz")).toBeInTheDocument();
		expect(
			difficult.getByText("Quem escreveu o Salmo 90?"),
		).toBeInTheDocument();
		expect(difficult.getByText("16%")).toBeInTheDocument();
		expect(difficult.getByText(/Média 4,86 s/)).toBeInTheDocument();
		// Decoration: the statement already says what the question is.
		const image = screen
			.getByText("Quem escreveu o Salmo 90?")
			.closest("a")
			?.querySelector("img");
		expect(image).toHaveAttribute("src", "https://media.test/salmo.png");
		expect(image).toHaveAttribute("alt", "");

		expect(await section("Ajuda necessária (7)")).toBeTruthy();
		expect(await section("Não concluiu (0)")).toBeTruthy();
	});

	it("everybody who needs help is readable, five in the card", async () => {
		renderSummary();

		const help = await section("Ajuda necessária (7)");

		expect(
			help.getAllByRole("listitem").map((item) => item.textContent),
		).toEqual(["Sete0%", "Bia C0%", "Muela0%", "Davi0%", "Eva0%"]);
	});

	it("'Ver tudo' and the card's title point to the flagged views", async () => {
		renderSummary();

		expect(
			await screen.findByRole("link", { name: "Ver tudo (6)" }),
		).toHaveAttribute("href", "/reports/game-1?tab=questions&view=flagged");
		expect(
			screen.getByRole("link", { name: "Ajuda necessária (7)" }),
		).toHaveAttribute("href", "/reports/game-1?tab=participants&view=flagged");
		// The hardest question opens its detail.
		expect(
			screen.getByText("Quem escreveu o Salmo 90?").closest("a"),
		).toHaveAttribute(
			"href",
			"/reports/game-1?tab=questions&view=flagged&question=14",
		);
	});

	it("empty messages of the two cards", async () => {
		renderSummary({
			summary: {
				accuracyPercent: 85,
				hardestQuestion: null,
				difficultCount: 0,
				needsHelp: [],
			},
		});

		expect(
			(await section("Perguntas difíceis (0)")).getByText(
				"Nenhuma pergunta foi difícil para o grupo",
			),
		).toBeInTheDocument();
		expect(
			(await section("Ajuda necessária (0)")).getByText(
				"Ninguém precisou de ajuda",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Excelente resultado!" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Ver tudo/ })).toBeNull();
	});

	it("shows 'Excelente! Todos concluíram' when nobody is listed", async () => {
		renderSummary();

		expect(
			(await section("Não concluiu (0)")).getByText(
				"Excelente! Todos concluíram",
			),
		).toBeInTheDocument();
	});

	it("lists who did not finish, with how many questions", async () => {
		renderSummary({
			summary: {
				didNotFinish: [
					participant("Bia", { unanswered: 2 }),
					participant("Caio", { unanswered: 1 }),
				],
			},
		});

		expect(
			(await section("Não concluiu (2)"))
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Bia2 perguntas sem resposta", "Caio1 pergunta sem resposta"]);
	});

	it("tells played of total when the game ended early", async () => {
		renderSummary({
			header: { endedEarly: true, playedCount: 7 },
		});

		const totals = within(
			await screen.findByRole("region", { name: "Totais" }),
		);
		expect(totals.getByText("Perguntas").nextSibling).toHaveTextContent(
			"7 de 15",
		);
	});

	it("tells that the game ended before the first results", async () => {
		renderSummary({
			header: { endedEarly: true, playedCount: 0 },
			summary: {
				accuracyPercent: null,
				hardestQuestion: null,
				difficultCount: 0,
				needsHelp: [],
			},
		});

		const overall = within(
			await screen.findByRole("region", { name: "Resultado geral" }),
		);
		expect(
			overall.getByRole("heading", {
				name: "A partida acabou antes da primeira revelação",
			}),
		).toBeInTheDocument();
		expect(overall.getByText("—")).toBeInTheDocument();
		expect(overall.queryByText("correto")).not.toBeInTheDocument();
	});

	it("hides 'Jogar de novo' when the quiz cannot be played, and tells a failure", async () => {
		renderSummary({
			header: { canPlayAgain: false, quizId: null },
			playAgain: { error: "Este quiz não pode mais ser jogado." },
		});

		await screen.findByRole("region", { name: "Resultado geral" });
		expect(
			screen.queryByRole("button", { name: "Jogar de novo" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Este quiz não pode mais ser jogado.",
		);
	});

	it("each '?' explains its rule", async () => {
		renderSummary();

		await screen.findByRole("region", { name: "Resultado geral" });
		for (const rule of [
			/menos de 35% dos participantes acerta a resposta/,
			/acertaram menos de 35% das respostas no jogo inteiro/,
			/não enviaram uma resposta a tempo/,
		]) {
			expect(screen.getByRole("button", { name: rule })).toBeInTheDocument();
		}
	});
});
