import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
	ParticipantDetailData,
	QuestionDetailData,
} from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { ParticipantDetail } from "./participant-detail";
import { QuestionDetail } from "./question-detail";
import { ReportNotFound, ReportTrashed } from "./report-states";

const ana: ParticipantDetailData = {
	playerId: "p1",
	nickname: "Ana",
	rank: 2,
	total: 893,
	accuracyPercent: 33,
	unanswered: 1,
	needsHelp: true,
	answers: [
		{
			questionIndex: 0,
			text: "Capital do Brasil?",
			type: "quiz",
			result: "correct",
			choices: [{ shapeIndex: 0, text: "Brasília", correct: true }],
			points: 893,
			responseTimeMs: 3200,
		},
		{
			questionIndex: 1,
			text: "Capital da França?",
			type: "quiz",
			result: "wrong",
			choices: [{ shapeIndex: 1, text: "Lyon", correct: false }],
			points: 0,
			responseTimeMs: 7400,
		},
		{
			questionIndex: 2,
			text: "A Terra é plana.",
			type: "trueFalse",
			result: "unanswered",
			choices: [],
			points: 0,
			responseTimeMs: null,
		},
	],
};

const answers = () =>
	within(screen.getByRole("list", { name: "Respostas" })).getAllByRole(
		"listitem",
	);

describe("ParticipantDetail (spec 015)", () => {
	it("shows each answer, its result, points and time", () => {
		render(<ParticipantDetail detail={ana} />);

		expect(screen.getByText("Classificação").nextSibling).toHaveTextContent(
			"2",
		);
		expect(screen.getByText("Pontuação final").nextSibling).toHaveTextContent(
			"893",
		);
		expect(screen.getByText("33%")).toBeInTheDocument();

		const [first, second] = answers().filter((item) =>
			item.textContent?.includes("Capital"),
		);
		const brazil = within(first as HTMLElement);
		expect(brazil.getByText("1 - Quiz")).toBeInTheDocument();
		expect(brazil.getByText("Capital do Brasil?")).toBeInTheDocument();
		expect(brazil.getByText("Brasília")).toBeInTheDocument();
		expect(brazil.getByText("Correta")).toBeInTheDocument();
		expect(brazil.getByText("893 pontos")).toBeInTheDocument();
		expect(brazil.getByText("3,2 s")).toBeInTheDocument();

		const france = within(second as HTMLElement);
		expect(france.getByText("Lyon")).toBeInTheDocument();
		expect(france.getByText("Incorreta")).toBeInTheDocument();
		expect(france.getByText("0 pontos")).toBeInTheDocument();
	});

	it("tells 'Sem resposta'", () => {
		render(<ParticipantDetail detail={ana} />);

		const last = within(
			answers().find((item) =>
				item.textContent?.includes("A Terra é plana."),
			) as HTMLElement,
		);

		expect(last.getByText("3 - Verdadeiro ou falso")).toBeInTheDocument();
		expect(last.getByText("Sem resposta")).toBeInTheDocument();
		expect(last.getByText("0 pontos")).toBeInTheDocument();
		expect(
			last.queryByRole("list", { name: "Resposta enviada" }),
		).not.toBeInTheDocument();
	});

	it("results are told in text", () => {
		const { container } = render(
			<ParticipantDetail
				detail={{
					...ana,
					answers: [
						...ana.answers,
						{
							questionIndex: 3,
							text: "Marque as capitais.",
							type: "quiz",
							result: "partiallyCorrect",
							choices: [{ shapeIndex: 0, text: "Lima", correct: true }],
							points: 450,
							responseTimeMs: 5000,
						},
					],
				}}
			/>,
		);

		expect(
			[...container.querySelectorAll("[data-result]")].map(
				(badge) => badge.textContent,
			),
		).toEqual(["Correta", "Incorreta", "Sem resposta", "Parcialmente correta"]);
		// The icons and the shapes say nothing by themselves.
		for (const drawing of container.querySelectorAll("svg")) {
			expect(drawing).toHaveAttribute("aria-hidden", "true");
		}
	});

	it("tells when the participant had no question", () => {
		render(
			<ParticipantDetail
				detail={{ ...ana, accuracyPercent: null, unanswered: 0, answers: [] }}
			/>,
		);

		expect(
			screen.getByText(/acabou antes de este participante ter uma pergunta/),
		).toBeInTheDocument();
	});
});

const salmo: QuestionDetailData = {
	index: 14,
	text: "Quem escreveu o Salmo 90?",
	type: "quiz",
	accuracyPercent: 23,
	difficult: true,
	imageUrl: "https://media.test/salmo.png",
	unanswered: 2,
	averageResponseTimeMs: 4860,
	choices: [
		{ id: "a", shapeIndex: 0, text: "Moisés", correct: true, count: 5 },
		{ id: "b", shapeIndex: 1, text: "Davi", correct: false, count: 12 },
		{ id: "c", shapeIndex: 2, text: "Salomão", correct: false, count: 3 },
		{ id: "d", shapeIndex: 3, text: "Asafe", correct: false, count: 0 },
	],
	participants: [
		{
			playerId: "p1",
			nickname: "Ana",
			result: "correct",
			choices: [{ shapeIndex: 0, text: "Moisés", correct: true }],
			points: 912,
			responseTimeMs: 2600,
		},
		{
			playerId: "p2",
			nickname: "Bia",
			result: "wrong",
			choices: [{ shapeIndex: 1, text: "Davi", correct: false }],
			points: 0,
			responseTimeMs: 6100,
		},
		{
			playerId: "p3",
			nickname: "Caio",
			result: "unanswered",
			choices: [],
			points: 0,
			responseTimeMs: null,
		},
	],
};

describe("QuestionDetail (spec 015)", () => {
	it("shows the answers with shape, text, the right one and the counts", () => {
		const { container } = render(<QuestionDetail detail={salmo} />);

		expect(screen.getByText("15 - Quiz")).toBeInTheDocument();
		expect(screen.getByText("Quem escreveu o Salmo 90?")).toBeInTheDocument();
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			"https://media.test/salmo.png",
		);

		const choices = within(
			screen.getByRole("list", { name: "Alternativas" }),
		).getAllByRole("listitem");
		expect(choices.map((choice) => choice.textContent)).toEqual([
			"MoisésCorreta5 escolheram",
			"Davi12 escolheram",
			"Salomão3 escolheram",
			"Asafe0 escolheram",
		]);
		// Each answer keeps the shape it had in the game.
		expect(
			choices.map((choice) =>
				choice
					.querySelector('[data-slot="answer-shape"]')
					?.getAttribute("data-shape"),
			),
		).toEqual(["triangle", "diamond", "circle", "square"]);
	});

	it("tells how many did not answer and the average time", () => {
		render(<QuestionDetail detail={salmo} />);

		expect(screen.getByText("23%")).toBeInTheDocument();
		expect(screen.getByText(/Média 4,86 s/)).toBeInTheDocument();
		expect(screen.getByText("2 não responderam")).toBeInTheDocument();
	});

	it("lists who answered what", () => {
		render(<QuestionDetail detail={salmo} />);

		const people = within(
			screen.getByRole("list", { name: "Respostas dos participantes" }),
		).getAllByRole("listitem");

		expect(people.map((person) => person.textContent)).toEqual([
			"AnaCorretaMoisés912 pontos2,6 s",
			"BiaIncorretaDavi0 pontos6,1 s",
			"CaioSem resposta0 pontos",
		]);
	});

	it("a question without an image shows none", () => {
		const { container } = render(
			<QuestionDetail detail={{ ...salmo, imageUrl: null, unanswered: 1 }} />,
		);

		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText("1 não respondeu")).toBeInTheDocument();
	});
});

describe("report states (spec 015)", () => {
	it("tells the report is in the trash and offers restore", async () => {
		const onRestore = vi.fn();
		renderWithRouter(<ReportTrashed onRestore={onRestore} />);

		expect(
			await screen.findByRole("heading", {
				name: "Este relatório está na lixeira",
			}),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));

		expect(onRestore).toHaveBeenCalledOnce();
		expect(screen.getByText("Abrir a lixeira").closest("a")).toHaveAttribute(
			"href",
			"/reports?section=trash",
		);
	});

	it("a missing report says so and points back to the list", async () => {
		renderWithRouter(<ReportNotFound />);

		expect(
			await screen.findByRole("heading", { name: "Relatório não encontrado" }),
		).toBeInTheDocument();
		expect(screen.getByText("Ver os relatórios").closest("a")).toHaveAttribute(
			"href",
			"/reports?section=reports",
		);
	});
});
