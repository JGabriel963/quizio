import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuizDetailsData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { type QuizDetailsActions, QuizDetailsView } from "./quiz-details-view";

const now = new Date("2026-06-15T12:00:00.000Z");

const quiz: QuizDetailsData = {
	themeId: "standard",
	customThemeId: null,
	id: "quiz-1",
	title: "Bom de Bíblia (Junho)",
	description: "Atos 1 a 7",
	coverImageUrl: null,
	visibility: "private",
	status: "draft",
	publishedVersion: null,
	publishedAt: null,
	hasUnpublishedChanges: false,
	questionCount: 0,
	createdAt: "2026-04-01T12:00:00.000Z",
	updatedAt: "2026-04-15T12:00:00.000Z",
	trashedAt: null,
};

function fakeActions(): QuizDetailsActions {
	return {
		onHost: vi.fn(),
		onAssign: vi.fn(),
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
		renderWithRouter(
			<QuizDetailsView quiz={quiz} actions={actions} now={now} />,
		);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Bom de Bíblia (Junho)",
			}),
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

	it("renders Editar linking to the quiz editor", async () => {
		renderWithRouter(
			<QuizDetailsView quiz={quiz} actions={fakeActions()} now={now} />,
		);

		expect(await screen.findByRole("link", { name: "Editar" })).toHaveAttribute(
			"href",
			"/creator/quiz-1",
		);
	});

	it("shows the untitled placeholder for quizzes without a title", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...quiz, title: null, description: null }}
				actions={fakeActions()}
				now={now}
			/>,
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Quiz sem título" }),
		).toBeInTheDocument();
	});

	it("shows the trash notice with only restore and delete permanently", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...quiz, trashedAt: "2026-06-10T12:00:00.000Z" }}
				actions={actions}
				now={now}
			/>,
		);

		expect(
			await screen.findByText("Este quiz está na lixeira."),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Editar dados" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Editar" })).toBeNull();
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

describe("QuizDetailsView status", () => {
	it("a draft shows its badge and that it was never saved as playable", async () => {
		renderWithRouter(
			<QuizDetailsView quiz={quiz} actions={fakeActions()} now={now} />,
		);

		expect(await screen.findByText("Rascunho")).toHaveAttribute(
			"data-slot",
			"badge",
		);
		expect(
			screen.getByText("Ainda não foi salvo como jogável"),
		).toBeInTheDocument();
	});

	it("tells when the playable version was saved", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{
					...quiz,
					status: "published",
					publishedVersion: 1,
					publishedAt: "2026-06-13T12:00:00.000Z",
				}}
				actions={fakeActions()}
				now={now}
			/>,
		);

		expect(
			await screen.findByText("Versão jogável salva anteontem"),
		).toBeInTheDocument();
		expect(screen.queryByText("Rascunho")).toBeNull();
		expect(screen.queryByText("Alterações não salvas")).toBeNull();
	});

	it("a published quiz with changes shows the badge", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{
					...quiz,
					status: "published",
					publishedVersion: 1,
					publishedAt: "2026-06-13T12:00:00.000Z",
					hasUnpublishedChanges: true,
				}}
				actions={fakeActions()}
				now={now}
			/>,
		);

		expect(await screen.findByText("Alterações não salvas")).toHaveAttribute(
			"data-slot",
			"badge",
		);
	});
});

describe("QuizDetailsView: Organizar ao vivo (spec 008)", () => {
	const published: QuizDetailsData = {
		...quiz,
		status: "published",
		publishedVersion: 1,
		publishedAt: "2026-06-01T12:00:00.000Z",
		questionCount: 3,
	};

	it("hosts a published quiz", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizDetailsView quiz={published} actions={actions} now={now} />,
		);

		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Organizar ao vivo" }));

		expect(actions.onHost).toHaveBeenCalledOnce();
		expect(
			screen.queryByText("A partida usa a última versão salva."),
		).toBeNull();
	});

	it("is unavailable in a draft, and says why", async () => {
		renderWithRouter(
			<QuizDetailsView quiz={quiz} actions={fakeActions()} now={now} />,
		);

		const button = await screen.findByRole("button", {
			name: "Organizar ao vivo",
		});
		expect(button).toBeDisabled();
		expect(button).toHaveAccessibleDescription(
			"Salve o quiz no editor para poder jogar.",
		);
	});

	it("warns that the game uses the last saved version", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...published, hasUnpublishedChanges: true }}
				actions={fakeActions()}
				now={now}
			/>,
		);

		expect(
			await screen.findByRole("button", { name: "Organizar ao vivo" }),
		).toBeEnabled();
		expect(
			screen.getByText("A partida usa a última versão salva."),
		).toBeInTheDocument();
	});

	it("is not offered in the trash", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...published, trashedAt: "2026-06-10T12:00:00.000Z" }}
				actions={fakeActions()}
				now={now}
			/>,
		);

		await screen.findByText("Este quiz está na lixeira.");
		expect(
			screen.queryByRole("button", { name: "Organizar ao vivo" }),
		).toBeNull();
	});
});

describe("QuizDetailsView: Kahoot layout", () => {
	it("shows the owner, the games, the participants and the open activities", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={quiz}
				actions={fakeActions()}
				now={now}
				owner={{ userId: "user-1", name: "João Gabriel" }}
				preview={{ questions: [], imageUrls: {} }}
				activity={{
					games: 3,
					participants: 1,
					openAssignments: [
						{
							gameId: "game-9",
							mode: "assignment",
							open: true,
							remainingMs: 2 * 24 * 60 * 60 * 1000,
							name: "Bom de Bíblia (Junho)",
							coverUrl: null,
							questionCount: 3,
							participantCount: 4,
							accuracyPercent: null,
							endedEarly: false,
							endedAt: null,
							trashedAt: null,
							quizId: "quiz-1",
							canPlayAgain: true,
							playQuizId: "quiz-1",
						},
					],
				}}
			/>,
		);

		expect(await screen.findByText("João Gabriel")).toBeInTheDocument();
		expect(screen.getByText(/jogos/).textContent).toBe("3jogos");
		expect(screen.getByText(/participante$/).textContent).toBe("1participante");
		const activity = screen.getByRole("link", { name: /Termina: em 2 dias/ });
		expect(activity).toHaveAttribute("href", "/reports/game-9");
		expect(activity).toHaveTextContent("Participantes:4");
		expect(
			screen.getByText("Este quiz ainda não tem perguntas."),
		).toBeInTheDocument();
	});

	it("switches the questions' layout and Mostrar respostas", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...quiz, questionCount: 1 }}
				actions={fakeActions()}
				now={now}
				preview={{ questions: [], imageUrls: {} }}
			/>,
		);
		const user = userEvent.setup();

		expect(
			await screen.findByRole("heading", { name: "Perguntas (0)" }),
		).toBeInTheDocument();
		const list = screen.getByRole("button", { name: "Lista de perguntas" });
		await user.click(list);
		expect(list).toHaveAttribute("aria-pressed", "true");
		expect(
			screen.getByRole("button", { name: "Grade de perguntas" }),
		).toHaveAttribute("aria-pressed", "false");
		await user.click(screen.getByRole("button", { name: "Mostrar respostas" }));
		expect(
			screen.getByRole("button", { name: "Ocultar respostas" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("puts the navigation it is given at the end of the top bar", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={quiz}
				actions={fakeActions()}
				now={now}
				navigation={<button type="button">Fechar</button>}
			/>,
		);

		expect(
			await screen.findByRole("button", { name: "Fechar" }),
		).toBeInTheDocument();
	});
});

describe("QuizDetailsView: Atribuir (spec 029)", () => {
	const published: QuizDetailsData = {
		...quiz,
		status: "published",
		publishedVersion: 1,
		publishedAt: "2026-06-01T12:00:00.000Z",
		questionCount: 3,
	};

	it("Atribuir sits beside Organizar ao vivo and opens Configurar atividade", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizDetailsView quiz={published} actions={actions} now={now} />,
		);

		const host = await screen.findByRole("button", {
			name: "Organizar ao vivo",
		});
		const assign = screen.getByRole("button", { name: "Atribuir" });
		await userEvent.setup().click(assign);

		expect(host.nextElementSibling).toBe(assign);
		expect(actions.onAssign).toHaveBeenCalledOnce();
	});

	it("Atribuir is unavailable for a draft, with the hint", async () => {
		renderWithRouter(
			<QuizDetailsView quiz={quiz} actions={fakeActions()} now={now} />,
		);

		const button = await screen.findByRole("button", { name: "Atribuir" });
		expect(button).toBeDisabled();
		expect(button).toHaveAccessibleDescription(
			"Salve o quiz no editor para poder jogar.",
		);
	});

	it("there is no Atribuir in the trash", async () => {
		renderWithRouter(
			<QuizDetailsView
				quiz={{ ...published, trashedAt: "2026-06-10T12:00:00.000Z" }}
				actions={fakeActions()}
				now={now}
			/>,
		);

		await screen.findByText("Este quiz está na lixeira.");
		expect(screen.queryByRole("button", { name: "Atribuir" })).toBeNull();
	});
});
