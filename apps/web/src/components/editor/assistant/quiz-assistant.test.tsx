import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
import { DEFAULT_CREDIT_PRICING } from "@quizio/core/quiz/domain/generation-credits";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
	AssistantStatusData,
	GeneratedQuestionData,
} from "@/lib/api-types";

import {
	QuizAssistant,
	type QuizAssistantActions,
	type QuizAssistantProps,
} from "./quiz-assistant";

const generated = (id: string, text: string): GeneratedQuestionData => ({
	id,
	type: "quiz",
	text,
	textFormatting: {},
	timeLimitSeconds: 20,
	points: "standard",
	image: null,
	aiGenerated: true,
	selection: "single",
	choices: [
		{
			id: "choice-1",
			text: "Mercúrio",
			textFormatting: {},
			image: null,
			correct: false,
		},
		{
			id: "choice-2",
			text: "Júpiter",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "choice-3",
			text: "Marte",
			textFormatting: {},
			image: null,
			correct: false,
		},
		{
			id: "choice-4",
			text: "Vênus",
			textFormatting: {},
			image: null,
			correct: false,
		},
	],
});

const status: AssistantStatusData = {
	enabled: true,
	limit: 20,
	used: 0,
	remaining: 20,
	nextAvailableAt: null,
	nextFreeInMs: null,
	options: DEFAULT_GENERATION_OPTIONS,
	pricing: DEFAULT_CREDIT_PRICING,
};

function renderAssistant(overrides: Partial<QuizAssistantProps> = {}) {
	const actions: QuizAssistantActions = {
		generate: vi.fn(async () => ({
			questions: [
				generated("g1", "Qual é o maior planeta?"),
				generated("g2", "Qual planeta tem anéis?"),
			],
			discarded: 0,
			remaining: 19,
			creditsUsed: 1,
		})),
		uploadSource: vi.fn(async () => "sources/user-1/doc.pdf"),
		discardSource: vi.fn(),
		add: vi.fn(async () => true),
	};
	const onClose = vi.fn();
	render(
		<QuizAssistant
			open
			initialSource="topic"
			status={status}
			questionCount={1}
			actions={actions}
			onClose={onClose}
			{...overrides}
		/>,
	);
	return { actions, onClose, user: userEvent.setup() };
}

const topicField = () => screen.getByRole("textbox", { name: "Assunto" });
const createButton = () => screen.getByRole("button", { name: "Crie" });

describe("QuizAssistant (spec 027)", () => {
	it("opens with the topic source and Crie disabled", () => {
		renderAssistant();

		expect(
			screen.getByRole("dialog", { name: "Crie com o Assistente" }),
		).toBeInTheDocument();
		expect(topicField()).toHaveValue("");
		expect(createButton()).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByText("Sobre o que será o seu quiz?"),
		).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "Formato" })).toHaveTextContent(
			"Quiz",
		);
	});

	it("a suggestion fills the field without generating", async () => {
		const { actions, user } = renderAssistant();

		await user.click(screen.getByRole("button", { name: "Sistema solar" }));

		expect(topicField()).toHaveValue("Sistema solar");
		expect(actions.generate).not.toHaveBeenCalled();
	});

	it("cuts pasted text at the limit", () => {
		renderAssistant();

		fireEvent.change(topicField(), { target: { value: "a".repeat(20_010) } });

		expect((topicField() as HTMLTextAreaElement).value).toHaveLength(20_000);
	});

	it("generates from a topic and shows the questions to review", async () => {
		const { actions, user } = renderAssistant();
		await user.type(topicField(), "Sistema solar");

		await user.click(createButton());

		expect(actions.generate).toHaveBeenCalledWith({
			source: { kind: "topic", text: "Sistema solar" },
			options: DEFAULT_GENERATION_OPTIONS,
		});
		expect(
			await screen.findByText(
				"Suas perguntas estão prontas! Revise-as antes de prosseguir.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Qual é o maior planeta?" }),
		).toBeInTheDocument();
	});

	it("adds the checked questions and closes", async () => {
		const { actions, onClose, user } = renderAssistant();
		await user.type(topicField(), "Sistema solar");
		await user.click(createButton());

		await user.click(
			await screen.findByRole("checkbox", { name: "Qual planeta tem anéis?" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar (1)" }));

		expect(actions.add).toHaveBeenCalledWith([
			expect.objectContaining({ id: "g2" }),
		]);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("shows the failure message and keeps the topic", async () => {
		const { actions, user } = renderAssistant();
		vi.mocked(actions.generate).mockRejectedValueOnce({
			data: { domainCode: "QUIZ.GENERATION_FAILED" },
		});
		await user.type(topicField(), "Sistema solar");

		await user.click(createButton());

		expect(
			await screen.findByText(
				"Não foi possível criar as perguntas agora. Tente de novo.",
			),
		).toBeInTheDocument();
		expect(topicField()).toHaveValue("Sistema solar");
	});

	it("tells when the budget is used up (spec 045, RN-16)", async () => {
		const { user } = renderAssistant({
			status: {
				...status,
				remaining: 0,
				nextAvailableAt: new Date(2026, 9, 16, 9, 10).toISOString(),
			},
		});
		await user.type(topicField(), "Sistema solar");

		expect(createButton()).toHaveAttribute("aria-disabled", "true");
		expect(createButton()).toHaveAccessibleDescription(
			"Você usou os 20 créditos das últimas 24 horas. Os próximos voltam às 09:10.",
		);
	});

	it("shows the estimate before Crie (spec 045, RN-06)", async () => {
		const { user } = renderAssistant();

		expect(screen.queryByText(/Esta criação usa até/)).toBeNull();
		await user.type(topicField(), "Sistema solar");

		// About 20 questions on a short topic.
		expect(
			screen.getByText("Esta criação usa até 3 créditos"),
		).toBeInTheDocument();
	});

	it("Crie is unavailable when the estimate does not fit, and comes back when it does (spec 045, RN-08)", async () => {
		const notEnough =
			"Esta criação precisa de até 3 créditos e restam 2. Escolha menos páginas ou menos perguntas.";
		const { user } = renderAssistant({ status: { ...status, remaining: 2 } });
		await user.type(topicField(), "Sistema solar");

		expect(createButton()).toHaveAttribute("aria-disabled", "true");
		expect(createButton()).toHaveAccessibleDescription(notEnough);
		// Besides the button's hidden description, a line anyone can read.
		expect(
			screen
				.getAllByText(notEnough)
				.filter((element) => !element.closest("[hidden]")),
		).toHaveLength(1);

		await user.click(screen.getByRole("combobox", { name: "Duração do quiz" }));
		await user.click(
			await screen.findByRole("option", { name: "Cerca de 5 perguntas" }),
		);

		expect(createButton()).not.toHaveAttribute("aria-disabled");
		expect(
			screen.getByText("Esta criação usa até 1 crédito"),
		).toBeInTheDocument();
	});

	it("tells the credits a creation used (spec 045, RN-09)", async () => {
		const { user } = renderAssistant();
		await user.type(topicField(), "Sistema solar");

		await user.click(createButton());

		expect(
			await screen.findByText("Esta criação usou 1 crédito."),
		).toBeInTheDocument();
	});

	it("asks before discarding generated questions on close", async () => {
		const { onClose, user } = renderAssistant();
		await user.type(topicField(), "Sistema solar");
		await user.click(createButton());
		await screen.findByRole("checkbox", { name: "Qual planeta tem anéis?" });

		await user.click(screen.getByRole("button", { name: "Fechar" }));
		const confirm = await screen.findByRole("alertdialog", {
			name: "Descartar as perguntas criadas?",
		});
		await user.click(within(confirm).getByRole("button", { name: "Cancelar" }));

		expect(onClose).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Fechar" }));
		await user.click(
			within(
				await screen.findByRole("alertdialog", {
					name: "Descartar as perguntas criadas?",
				}),
			).getByRole("button", { name: "Descartar" }),
		);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("closes at once with nothing created", async () => {
		const { onClose, user } = renderAssistant();

		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("asks before replacing checked questions", async () => {
		const { actions, user } = renderAssistant();
		await user.type(topicField(), "Sistema solar");
		await user.click(createButton());
		await user.click(
			await screen.findByRole("checkbox", { name: "Qual planeta tem anéis?" }),
		);

		await user.click(createButton());
		const confirm = await screen.findByRole("alertdialog", {
			name: "Substituir as perguntas criadas?",
		});
		await user.click(within(confirm).getByRole("button", { name: "Cancelar" }));

		expect(actions.generate).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("checkbox", { name: "Qual planeta tem anéis?" }),
		).toBeChecked();
	});
});
