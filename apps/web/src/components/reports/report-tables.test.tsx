import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
	ReportParticipantData,
	ReportQuestionData,
} from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { ParticipantsTable } from "./participants-table";
import { QuestionsTable } from "./questions-table";

/** 25 participants by rank; the last 11 got less than 35%. */
const participants: ReportParticipantData[] = Array.from(
	{ length: 25 },
	(_, index) => {
		const accuracyPercent = index < 14 ? 87 - index * 4 : 30 - (index - 14) * 3;
		return {
			playerId: `p${index + 1}`,
			nickname: `Jogador ${index + 1}`,
			rank: index + 1,
			total: 10_895 - index * 400,
			accuracyPercent,
			unanswered: index === 3 ? 2 : 0,
			needsHelp: index >= 14,
		};
	},
);

const rows = async (name: string) =>
	within(await screen.findByRole("list", { name })).getAllByRole("listitem");

describe("ParticipantsTable (spec 015)", () => {
	it("shows ten rows and the rest on 'Mostrar mais'", async () => {
		renderWithRouter(
			<ParticipantsTable
				gameId="game-1"
				participants={participants}
				view="all"
			/>,
		);

		expect(await rows("Participantes")).toHaveLength(10);
		const first = within((await rows("Participantes"))[0] as HTMLElement);
		expect(first.getByRole("link", { name: "Jogador 1" })).toHaveAttribute(
			"href",
			"/reports/game-1?tab=participants&view=all&participant=p1",
		);
		expect(first.getByText("87%")).toBeInTheDocument();
		expect(first.getByText("10.895")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Mostrar mais" }));

		expect(await rows("Participantes")).toHaveLength(25);
		expect(
			screen.queryByRole("button", { name: "Mostrar mais" }),
		).not.toBeInTheDocument();
	});

	it("a dash when nothing was left unanswered", async () => {
		renderWithRouter(
			<ParticipantsTable
				gameId="game-1"
				participants={participants}
				view="all"
			/>,
		);

		const list = await rows("Participantes");

		expect(
			within(list[0] as HTMLElement).getByText("Não respondido").parentElement,
		).toHaveTextContent("—");
		expect(
			within(list[3] as HTMLElement).getByText("Não respondido").parentElement,
		).toHaveTextContent("2");
	});

	it("the two lists are links, with their counts", async () => {
		renderWithRouter(
			<ParticipantsTable
				gameId="game-1"
				participants={participants}
				view="all"
			/>,
		);

		const tabs = within(
			await screen.findByRole("navigation", { name: "Participantes a listar" }),
		).getAllByRole("link");

		expect(tabs.map((tab) => tab.textContent)).toEqual([
			"Todos (25)",
			"Ajuda necessária (11)",
		]);
		expect(tabs[0]).toHaveAttribute("aria-current", "page");
		expect(tabs[1]).toHaveAttribute(
			"href",
			"/reports/game-1?tab=participants&view=flagged",
		);
	});

	it("the flagged view lists who needs help, lowest first", async () => {
		renderWithRouter(
			<ParticipantsTable
				gameId="game-1"
				participants={participants}
				view="flagged"
			/>,
		);

		const list = await rows("Participantes");

		expect(list).toHaveLength(10);
		expect(within(list[0] as HTMLElement).getByRole("link")).toHaveTextContent(
			"Jogador 25",
		);
		expect(within(list[1] as HTMLElement).getByRole("link")).toHaveTextContent(
			"Jogador 24",
		);
	});

	it("tells when nobody needs help", async () => {
		renderWithRouter(
			<ParticipantsTable
				gameId="game-1"
				participants={participants.slice(0, 5)}
				view="flagged"
			/>,
		);

		expect(
			await screen.findByText("Ninguém precisou de ajuda"),
		).toBeInTheDocument();
	});
});

const questions: ReportQuestionData[] = [
	"Qual foi o profeta que confrontou o rei Davi?",
	"Qual rei de Judá foi acometido de lepra?",
	"Quem foi o pai de Matusalém?",
	"Em qual livro está o episódio do Sol parar?",
	"Quem viu Deus sentado no alto trono?",
	"O que acontece quando o sétimo selo é aberto?",
	"Qual o nome do pai de Saul?",
	"Qual livro não menciona o nome de Deus?",
	"Quem foi o primeiro mártir cristão?",
	"Qual era o nome do pai de Moisés?",
	"Quem escreveu o Salmo 90?",
	"Jonas foi engolido por um grande peixe.",
].map((text, index) => ({
	index,
	text,
	type: index === 11 ? "trueFalse" : "quiz",
	accuracyPercent: [20, 16, 52, 36, 40, 32, 32, 44, 68, 36, 16, 90][index] ?? 0,
	difficult: [0, 1, 5, 6, 10].includes(index),
}));

describe("QuestionsTable (spec 015)", () => {
	it("shows ten rows in the order played", async () => {
		renderWithRouter(
			<QuestionsTable gameId="game-1" questions={questions} view="all" />,
		);

		const list = await rows("Perguntas");

		expect(list).toHaveLength(10);
		const first = within(list[0] as HTMLElement);
		expect(first.getByText("1")).toBeInTheDocument();
		expect(
			first.getByRole("link", {
				name: "Qual foi o profeta que confrontou o rei Davi?",
			}),
		).toHaveAttribute(
			"href",
			"/reports/game-1?tab=questions&view=all&question=0",
		);
		expect(first.getByText("Quiz")).toBeInTheDocument();
		expect(first.getByText("20%")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Mostrar mais" }));
		const all = await rows("Perguntas");
		expect(all).toHaveLength(12);
		expect(
			within(all[11] as HTMLElement).getByText("Verdadeiro ou falso"),
		).toBeInTheDocument();
	});

	it("filters by the statement", async () => {
		renderWithRouter(
			<QuestionsTable gameId="game-1" questions={questions} view="all" />,
		);

		await userEvent.type(
			await screen.findByRole("searchbox", { name: "Pesquisar perguntas" }),
			"MATUSALEM",
		);

		const list = await rows("Perguntas");
		expect(list).toHaveLength(1);
		expect(list[0]).toHaveTextContent("Quem foi o pai de Matusalém?");
		// It keeps the number it had in the game.
		expect(within(list[0] as HTMLElement).getByText("3")).toBeInTheDocument();

		await userEvent.type(screen.getByRole("searchbox"), "xyz");
		expect(
			screen.getByText("Nada encontrado para “MATUSALEMxyz”."),
		).toBeInTheDocument();
	});

	it("the flagged view lists the difficult ones", async () => {
		renderWithRouter(
			<QuestionsTable gameId="game-1" questions={questions} view="flagged" />,
		);

		const list = await rows("Perguntas");

		expect(list.map((row) => row.firstElementChild?.textContent)).toEqual([
			"1",
			"2",
			"6",
			"7",
			"11",
		]);
		expect(
			within(screen.getByRole("navigation", { name: "Perguntas a listar" }))
				.getAllByRole("link")
				.map((tab) => tab.textContent),
		).toEqual(["Todos (12)", "Perguntas difíceis (5)"]);
	});

	it("tells when no question was difficult", async () => {
		renderWithRouter(
			<QuestionsTable
				gameId="game-1"
				questions={questions.filter((question) => !question.difficult)}
				view="flagged"
			/>,
		);

		expect(
			await screen.findByText("Nenhuma pergunta foi difícil para o grupo"),
		).toBeInTheDocument();
	});
});
