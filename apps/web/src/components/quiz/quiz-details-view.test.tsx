import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuizDetailsData } from "@/lib/api-types";

import { type QuizDetailsActions, QuizDetailsView } from "./quiz-details-view";

const now = new Date("2026-06-15T12:00:00.000Z");

const quiz: QuizDetailsData = {
	id: "quiz-1",
	title: "Bom de Bíblia (Junho)",
	description: "Atos 1 a 7",
	coverImageUrl: null,
	visibility: "private",
	status: "draft",
	questionCount: 0,
	createdAt: "2026-04-01T12:00:00.000Z",
	updatedAt: "2026-04-15T12:00:00.000Z",
	trashedAt: null,
};

function fakeActions(): QuizDetailsActions {
	return {
		onEdit: vi.fn(),
		onDuplicate: vi.fn(),
		onMoveToTrash: vi.fn(),
		onRestore: vi.fn(),
		onDeletePermanently: vi.fn(),
	};
}

describe("QuizDetailsView", () => {
	it("shows cover, title, description, visibility, zero questions and last change with edit, duplicate and delete actions", async () => {
		const actions = fakeActions();
		render(<QuizDetailsView quiz={quiz} actions={actions} now={now} />);

		expect(
			screen.getByRole("heading", { level: 1, name: "Bom de Bíblia (Junho)" }),
		).toBeInTheDocument();
		expect(screen.getByText("Atos 1 a 7")).toBeInTheDocument();
		expect(screen.getByText("Privado")).toBeInTheDocument();
		expect(screen.getByText("0 perguntas")).toBeInTheDocument();
		expect(
			screen.getByText("Última modificação: há 2 meses"),
		).toBeInTheDocument();

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Duplicar" }));
		expect(actions.onDuplicate).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("button", { name: "Editar dados" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Mover para a lixeira" }),
		).toBeInTheDocument();
	});

	it("shows the untitled placeholder for quizzes without a title", () => {
		render(
			<QuizDetailsView
				quiz={{ ...quiz, title: null, description: null }}
				actions={fakeActions()}
				now={now}
			/>,
		);

		expect(
			screen.getByRole("heading", { level: 1, name: "Quiz sem título" }),
		).toBeInTheDocument();
	});

	it("shows the trash notice with only restore and delete permanently", async () => {
		const actions = fakeActions();
		render(
			<QuizDetailsView
				quiz={{ ...quiz, trashedAt: "2026-06-10T12:00:00.000Z" }}
				actions={actions}
				now={now}
			/>,
		);

		expect(screen.getByText("Este quiz está na lixeira.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Editar dados" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Duplicar" })).toBeNull();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Restaurar" }));
		expect(actions.onRestore).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("button", { name: "Excluir definitivamente" }),
		).toBeInTheDocument();
	});
});
