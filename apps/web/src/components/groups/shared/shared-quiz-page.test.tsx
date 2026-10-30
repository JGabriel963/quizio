import type { Question } from "@quizio/core/quiz/domain/question";
import {
	aFormattedAnswersQuestion,
	aPuzzleQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicQuizPageData, SharedQuizPageData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { SharedQuizPage } from "./shared-quiz-page";

const base = {
	textFormatting: {},
	timeLimitSeconds: 20,
	points: "standard",
	aiGenerated: false,
} as const;

const questions: Question[] = [
	{
		...base,
		id: "q1",
		type: "quiz",
		text: "Capital do Brasil?",
		selection: "single",
		image: {
			key: "media/ana/q1.png",
			placement: "media",
			crop: null,
			altText: "Mapa",
		},
		choices: [
			{ id: "a", text: "Brasília", correct: true },
			{ id: "b", text: "Rio", correct: false },
			{ id: "c", text: null, correct: false },
			{ id: "d", text: null, correct: false },
		],
	},
	{
		...base,
		id: "q2",
		type: "trueFalse",
		text: "O sol é uma estrela",
		image: null,
		correct: true,
	},
	{
		...base,
		id: "q3",
		type: "typeAnswer",
		text: "Maior planeta?",
		image: null,
		acceptedAnswers: ["Júpiter", null, null, null],
	},
] as Question[];

function aPage(
	overrides: Partial<SharedQuizPageData> = {},
): SharedQuizPageData {
	return {
		quizId: "capitais",
		title: "Capitais",
		description: "Revisão da prova",
		coverUrl: null,
		visibility: "private",
		owner: { userId: "ana", name: "Ana" },
		sharedBy: { userId: "bruno", name: "Bruno" },
		sharedAt: new Date().toISOString(),
		games: 2,
		participants: 10,
		questions,
		imageUrls: { "media/ana/q1.png": "https://media.test/media/ana/q1.png" },
		ownedByViewer: false,
		canUnshare: false,
		...overrides,
	} as SharedQuizPageData;
}

function renderPage(quiz = aPage()) {
	const user = userEvent.setup();
	const actions = {
		onHost: vi.fn(),
		onAssign: vi.fn(),
		onDuplicate: vi.fn(),
	};
	renderWithRouter(<SharedQuizPage quiz={quiz} {...actions} />);
	return { user, ...actions };
}

describe("SharedQuizPage (spec 037, RN-16 to RN-21)", () => {
	it("shows owner, cover, title, description, N jogos, N participantes and Perguntas (N) without answers", async () => {
		renderPage();

		expect(
			await screen.findByRole("heading", { name: "Capitais" }),
		).toBeVisible();
		expect(screen.getByText("Ana")).toBeVisible();
		expect(screen.getByText("Revisão da prova")).toBeVisible();
		expect(screen.getByText("2 jogos")).toBeVisible();
		expect(screen.getByText("10 participantes")).toBeVisible();
		expect(screen.getByText("Compartilhado por Bruno")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Perguntas (3)" }),
		).toBeVisible();
		expect(screen.getByText("Capital do Brasil?")).toBeVisible();
		expect(screen.getByRole("img", { name: "Mapa" })).toHaveAttribute(
			"src",
			"https://media.test/media/ana/q1.png",
		);
		expect(screen.getByText(/1 · Quiz · 20 segundos/)).toBeVisible();
		expect(screen.queryByText("Brasília")).toBeNull();
	});

	it("questions show their formatting (spec 047, RN-25)", async () => {
		const [first, ...rest] = questions;
		renderWithRouter(
			<SharedQuizPage
				quiz={aPage({
					questions: [
						{
							...(first as Question),
							text: "H2O?",
							textFormatting: { subscript: [[1, 2]] },
						},
						...rest,
					],
				})}
				onHost={vi.fn()}
				onAssign={vi.fn()}
				onDuplicate={vi.fn()}
			/>,
		);

		expect(await screen.findByText("2", { selector: "sub" })).toBeVisible();
	});

	it("draws the answers formatted, in normal weight (spec 048, RN-18)", async () => {
		const { user } = renderPage(
			aPage({
				questions: [
					aFormattedAnswersQuestion({ id: "q9" }),
					aPuzzleQuestion({
						id: "q10",
						items: ["H2O", "Sal", "Ar", null],
						itemFormatting: [{ subscript: [[1, 2]] }, {}, {}, {}],
					}),
				],
			}),
		);

		await user.click(
			await screen.findByRole("button", { name: "Mostrar respostas" }),
		);

		const subs = await screen.findAllByText("2", { selector: "sub" });
		expect(subs).toHaveLength(2);
		for (const sub of subs) {
			expect(sub.parentElement).toHaveClass("font-normal");
		}
	});

	it("Mostrar respostas shows the answers with the right ones marked", async () => {
		const { user } = renderPage();

		await user.click(
			await screen.findByRole("button", { name: "Mostrar respostas" }),
		);

		const first = screen.getAllByRole("list", {
			name: "Respostas",
		})[0] as HTMLElement;
		expect(within(first).getByText("Brasília").closest("li")).toHaveTextContent(
			"(correta)",
		);
		expect(within(first).getByText("Rio").closest("li")).not.toHaveTextContent(
			"(correta)",
		);
		expect(screen.getByText("Verdadeiro").closest("li")).toHaveTextContent(
			"(correta)",
		);
		expect(screen.getByText("Júpiter")).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Ocultar respostas" }),
		).toBeVisible();
	});

	it("Editar opens Duplique para editar; Cancelar closes and Duplicar duplicates", async () => {
		const { user, onDuplicate } = renderPage();

		await user.click(await screen.findByRole("button", { name: "Editar" }));
		const ask = await screen.findByRole("alertdialog", {
			name: "Duplique para editar",
		});
		expect(ask).toHaveTextContent(
			"Não é possível editar esse quiz, mas é possível duplicá-lo para realizar edições.",
		);
		await user.click(within(ask).getByRole("button", { name: "Cancelar" }));
		expect(onDuplicate).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(
			within(
				await screen.findByRole("alertdialog", {
					name: "Duplique para editar",
				}),
			).getByRole("button", { name: "Duplicar" }),
		);
		expect(onDuplicate).toHaveBeenCalledTimes(1);
	});

	it("Organizar ao vivo, Atribuir and Duplicar call their actions", async () => {
		const { user, onHost, onAssign, onDuplicate } = renderPage();

		await user.click(
			await screen.findByRole("button", { name: "Organizar ao vivo" }),
		);
		await user.click(screen.getByRole("button", { name: "Atribuir" }));
		await user.click(screen.getByRole("button", { name: "Duplicar" }));

		expect(onHost).toHaveBeenCalled();
		expect(onAssign).toHaveBeenCalled();
		expect(onDuplicate).toHaveBeenCalled();
	});

	it("a public quiz opened from the profile has no Compartilhado por (spec 039, RN-33)", async () => {
		const publicQuiz: PublicQuizPageData = {
			themeId: "standard",
			customTheme: null,
			quizId: "capitais",
			title: "Capitais",
			description: "",
			coverUrl: null,
			owner: { userId: "ana", name: "Ana", photoUrl: null },
			games: 3,
			participants: 41,
			questions,
			imageUrls: {},
			ownedByViewer: false,
		};
		renderWithRouter(
			<SharedQuizPage
				quiz={publicQuiz}
				onHost={vi.fn()}
				onAssign={vi.fn()}
				onDuplicate={vi.fn()}
			/>,
		);

		expect(
			await screen.findByRole("heading", { name: "Capitais" }),
		).toBeVisible();
		expect(screen.getByText("3 jogos")).toBeVisible();
		expect(screen.queryByText(/Compartilhado por/)).toBeNull();
		expect(
			screen.getByRole("button", { name: "Organizar ao vivo" }),
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Mostrar respostas" }),
		).toBeVisible();
	});
});
