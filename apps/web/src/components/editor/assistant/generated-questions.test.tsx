import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GeneratedQuestionData } from "@/lib/api-types";
import type { AssistantLayout, Generation } from "@/lib/assistant-state";

import { GeneratedQuestions } from "./generated-questions";

const quiz: GeneratedQuestionData = {
	id: "g1",
	type: "quiz",
	text: "Qual é o maior planeta?",
	timeLimitSeconds: 20,
	points: "standard",
	image: null,
	aiGenerated: true,
	selection: "single",
	choices: [
		{ id: "choice-1", text: "Terra", correct: false },
		{ id: "choice-2", text: "Júpiter", correct: true },
		{ id: "choice-3", text: "Marte", correct: false },
		{ id: "choice-4", text: "Vênus", correct: false },
	],
};
const trueFalse: GeneratedQuestionData = {
	id: "g2",
	type: "trueFalse",
	text: "Plutão é um planeta anão",
	timeLimitSeconds: 20,
	points: "standard",
	image: null,
	aiGenerated: true,
	correct: true,
};

function renderGrid(
	generation: Generation,
	{
		checked = [],
		layout = "grid",
	}: { checked?: string[]; layout?: AssistantLayout } = {},
) {
	const onToggle = vi.fn();
	const view = render(
		<GeneratedQuestions
			generation={generation}
			checked={checked}
			layout={layout}
			onToggle={onToggle}
		/>,
	);
	return { onToggle, view, user: userEvent.setup() };
}

const done = (requested: number | null = 2): Generation => ({
	status: "done",
	questions: [quiz, trueFalse],
	discarded: 0,
	requested,
	creditsUsed: 2,
});

describe("GeneratedQuestions (spec 027)", () => {
	it("shows the ready banner and the cards", async () => {
		const { onToggle, user } = renderGrid(done());

		expect(
			screen.getByText(
				"Suas perguntas estão prontas! Revise-as antes de prosseguir.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("Revise as perguntas: a IA pode cometer erros."),
		).toBeInTheDocument();
		await user.click(
			screen.getByRole("checkbox", { name: "Plutão é um planeta anão" }),
		);
		expect(onToggle).toHaveBeenCalledWith("g2");

		await user.click(screen.getByRole("button", { name: "Fechar aviso" }));
		expect(
			screen.queryByText(
				"Suas perguntas estão prontas! Revise-as antes de prosseguir.",
			),
		).not.toBeInTheDocument();
	});

	it("the ready banner tells the credits used (spec 045, RN-09)", () => {
		renderGrid(done());

		expect(
			screen.getByText("Esta criação usou 2 créditos."),
		).toBeInTheDocument();
	});

	it("marks the correct answer with a check", () => {
		renderGrid(done());

		const card = screen.getByRole("listitem", {
			name: "Qual é o maior planeta?",
		});
		expect(within(card).getByText("Júpiter").closest("li")).toHaveAttribute(
			"data-correct",
			"true",
		);
		expect(within(card).getByText("Terra").closest("li")).toHaveAttribute(
			"data-correct",
			"false",
		);
		expect(within(card).getByText("Júpiter (correta)")).toBeInTheDocument();
	});

	it("the three layouts show the same cards and checks", () => {
		const { view } = renderGrid(done(), { checked: ["g1"] });

		for (const layout of ["single", "grid", "list"] as const) {
			view.rerender(
				<GeneratedQuestions
					generation={done()}
					checked={["g1"]}
					layout={layout}
					onToggle={vi.fn()}
				/>,
			);
			expect(
				screen.getByRole("list", { name: "Perguntas criadas" }),
			).toHaveAttribute("data-layout", layout);
			expect(screen.getAllByRole("checkbox")).toHaveLength(2);
			expect(
				screen.getByRole("checkbox", { name: "Qual é o maior planeta?" }),
			).toBeChecked();
		}
	});

	it("tells how many came when fewer than asked", () => {
		renderGrid(done(10));

		expect(screen.getByText("Foram criadas 2 perguntas.")).toBeInTheDocument();
	});

	it("shows the nothing-usable message", () => {
		renderGrid({
			status: "done",
			questions: [],
			discarded: 3,
			requested: 10,
			creditsUsed: 1,
		});

		expect(
			screen.getByText(
				"Não foi possível criar perguntas com esse conteúdo. Tente outro assunto ou outras páginas.",
			),
		).toBeInTheDocument();
	});

	it("shows the failure message", () => {
		renderGrid({ status: "failed", message: "Falhou de novo." });

		expect(screen.getByRole("alert")).toHaveTextContent("Falhou de novo.");
	});

	it("shows skeletons while generating", () => {
		renderGrid({ status: "generating" });

		expect(screen.getByText("Criando suas perguntas…")).toBeInTheDocument();
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("invites to start while idle", () => {
		renderGrid({ status: "idle" });

		expect(
			screen.getByText("Sobre o que será o seu quiz?"),
		).toBeInTheDocument();
	});
});
