import { DEFAULT_GENERATION_OPTIONS } from "@quizio/core/quiz/domain/generation";
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
	timeLimitSeconds: 20,
	points: "standard",
	image: null,
	aiGenerated: true,
	selection: "single",
	choices: [
		{ id: "choice-1", text: "Mercúrio", correct: false },
		{ id: "choice-2", text: "Júpiter", correct: true },
		{ id: "choice-3", text: "Marte", correct: false },
		{ id: "choice-4", text: "Vênus", correct: false },
	],
});

const status: AssistantStatusData = {
	enabled: true,
	limit: 20,
	remaining: 20,
	nextAvailableAt: null,
	options: DEFAULT_GENERATION_OPTIONS,
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

	it("quota exhausted disables Crie and shows the next time", async () => {
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
			"Você usou as 20 criações das últimas 24 horas. A próxima fica disponível às 09:10.",
		);
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
