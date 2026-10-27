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
	hasUnpublishedChanges: false,
	questionCount: 0,
	updatedAt: "2026-04-15T12:00:00.000Z",
	trashedAt: null,
	description: "",
};

function fakeActions(): QuizItemActions {
	return {
		onAssign: vi.fn(),
		onHost: vi.fn(),
		onEdit: vi.fn(),
		onDuplicate: vi.fn(),
		onMoveToTrash: vi.fn(),
		onRestore: vi.fn(),
		onDeletePermanently: vi.fn(),
		onSetVisibility: vi.fn(),
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
		).toEqual([
			"Editar dados",
			"Visibilidade",
			"Duplicar",
			"Mover para a lixeira",
		]);
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

describe("QuizListItem status", () => {
	it.each([
		["a draft", {}, "Rascunho"],
		[
			"a published quiz with changes",
			{ status: "published", hasUnpublishedChanges: true },
			"Alterações não salvas",
		],
	] as const)("shows the status badge of %s", async (_, overrides, label) => {
		renderWithRouter(
			<QuizListItem
				item={{ ...item, ...overrides }}
				section="recent"
				now={now}
				actions={fakeActions()}
			/>,
		);

		expect(await screen.findByText(label)).toHaveAttribute(
			"data-slot",
			"badge",
		);
	});

	it("a published quiz without changes has no status badge", async () => {
		renderWithRouter(
			<QuizListItem
				item={{ ...item, status: "published" }}
				section="recent"
				now={now}
				actions={fakeActions()}
			/>,
		);

		await screen.findByRole("link", { name: "Bom de Bíblia (Junho)" });
		expect(screen.queryByText("Rascunho")).toBeNull();
		expect(screen.queryByText("Alterações não salvas")).toBeNull();
		expect(screen.queryByText("Publicado")).toBeNull();
	});
});

describe("QuizListItem: Atribuir and Organizar ao vivo (spec 029, RN-02)", () => {
	const published: LibraryItemView = {
		...item,
		status: "published",
		questionCount: 3,
	};

	it("a published row shows Atribuir and Organizar ao vivo on hover and focus", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizListItem
				item={published}
				section="recent"
				now={now}
				actions={actions}
			/>,
		);
		const user = userEvent.setup();

		const shown = await screen.findByRole("group", {
			name: "Jogar Bom de Bíblia (Junho)",
		});
		expect(shown.className).toMatch(/group-hover/);
		expect(shown.className).toMatch(/group-focus-within/);
		await user.click(screen.getByRole("button", { name: "Atribuir" }));
		await user.click(screen.getByRole("button", { name: "Organizar ao vivo" }));

		expect(actions.onAssign).toHaveBeenCalledWith(published);
		expect(actions.onHost).toHaveBeenCalledWith(published);
	});

	it("a draft row shows neither", async () => {
		renderWithRouter(
			<QuizListItem
				item={item}
				section="drafts"
				now={now}
				actions={fakeActions()}
			/>,
		);

		await screen.findByRole("button", {
			name: "Ações para Bom de Bíblia (Junho)",
		});
		expect(screen.queryByRole("button", { name: "Atribuir" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Organizar ao vivo" }),
		).toBeNull();
	});

	it("the row's menu has both on a narrow screen", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizListItem
				item={published}
				section="recent"
				now={now}
				actions={actions}
			/>,
		);

		const user = await openActionsMenu("Bom de Bíblia (Junho)");
		const assign = await screen.findByRole("menuitem", { name: "Atribuir" });
		expect(assign.className).toMatch(/sm:hidden/);
		expect(
			screen.getByRole("menuitem", { name: "Organizar ao vivo" }).className,
		).toMatch(/sm:hidden/);
		await user.click(assign);

		expect(actions.onAssign).toHaveBeenCalledWith(published);
	});

	it("Visibilidade submenu with Privado and Público, info texts, and the choice goes up (spec 039, RN-25a)", async () => {
		const actions = fakeActions();
		renderWithRouter(
			<QuizListItem item={item} section="recent" now={now} actions={actions} />,
		);

		const user = await openActionsMenu("Bom de Bíblia (Junho)");
		await user.click(
			await screen.findByRole("menuitem", { name: "Visibilidade" }),
		);

		const privateOption = await screen.findByRole("menuitemradio", {
			name: /Privado/,
		});
		const publicOption = screen.getByRole("menuitemradio", { name: /Público/ });
		expect(privateOption).toHaveAttribute("aria-checked", "true");
		expect(publicOption).toHaveAttribute("aria-checked", "false");
		expect(
			screen.getByRole("img", { name: "Visível apenas para você." }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "Visível para todos no seu perfil." }),
		).toBeInTheDocument();

		// Base UI turns the parent menu's pointer events off while the submenu is open.
		await userEvent.setup({ pointerEventsCheck: 0 }).click(publicOption);

		expect(actions.onSetVisibility).toHaveBeenCalledWith(item, "public");
	});
});
