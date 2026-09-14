import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LibraryItemView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { type QuizItemActions, QuizListItem } from "./quiz-list-item";

const now = new Date("2026-06-15T12:00:00.000Z");

const item: LibraryItemView = {
	id: "quiz-1",
	title: "Bom de Bíblia (Junho)",
	coverImageUrl: null,
	visibility: "private",
	status: "draft",
	questionCount: 0,
	updatedAt: "2026-04-15T12:00:00.000Z",
	trashedAt: null,
};

function fakeActions(): QuizItemActions {
	return {
		onEdit: vi.fn(),
		onDuplicate: vi.fn(),
		onMoveToTrash: vi.fn(),
		onRestore: vi.fn(),
		onDeletePermanently: vi.fn(),
	};
}

async function openActionsMenu(title: string) {
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: `Ações para ${title}` }),
	);
	return user;
}

describe("QuizListItem", () => {
	it("shows cover, display title, zero questions, visibility and relative time", async () => {
		renderWithRouter(
			<QuizListItem
				item={{ ...item, title: null }}
				section="recent"
				now={now}
				actions={fakeActions()}
			/>,
		);

		expect(
			await screen.findByRole("link", { name: "Quiz sem título" }),
		).toHaveAttribute("href", "/quizzes/quiz-1");
		expect(screen.getByText("0 perguntas")).toBeInTheDocument();
		expect(screen.getByText("Privado")).toBeInTheDocument();
		expect(screen.getByText("há 2 meses")).toBeInTheDocument();
	});

	it("shows the uploaded cover image as decoration next to the title", async () => {
		const { container } = renderWithRouter(
			<QuizListItem
				item={{ ...item, coverImageUrl: "https://media.test/cover.png" }}
				section="recent"
				now={now}
				actions={fakeActions()}
			/>,
		);

		await screen.findByRole("link", { name: "Bom de Bíblia (Junho)" });
		const cover = container.querySelector("img");
		expect(cover).toHaveAttribute("src", "https://media.test/cover.png");
		expect(cover).toHaveAttribute("alt", "");
	});

	it("offers edit, duplicate and delete outside the trash", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizListItem item={item} section="recent" now={now} actions={actions} />,
		);

		const user = await openActionsMenu("Bom de Bíblia (Junho)");

		expect(
			(await screen.findAllByRole("menuitem")).map((menuItem) =>
				menuItem.textContent?.trim(),
			),
		).toEqual(["Editar dados", "Duplicar", "Mover para a lixeira"]);
		await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
		expect(actions.onDuplicate).toHaveBeenCalledWith(item);
	});

	it("offers restore or delete permanently inside the trash", async () => {
		const actions = fakeActions();
		const trashed = { ...item, trashedAt: "2026-06-01T12:00:00.000Z" };
		renderWithRouter(
			<QuizListItem
				item={trashed}
				section="trash"
				now={now}
				actions={actions}
			/>,
		);

		const user = await openActionsMenu("Bom de Bíblia (Junho)");

		expect(
			(await screen.findAllByRole("menuitem")).map((menuItem) =>
				menuItem.textContent?.trim(),
			),
		).toEqual(["Restaurar", "Excluir definitivamente"]);
		await user.click(screen.getByRole("menuitem", { name: "Restaurar" }));
		expect(actions.onRestore).toHaveBeenCalledWith(trashed);
	});
});
