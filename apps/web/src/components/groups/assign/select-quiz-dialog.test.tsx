import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LibraryItemView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { SelectQuizDialog } from "./select-quiz-dialog";

function anItem(overrides: Partial<LibraryItemView> = {}): LibraryItemView {
	return {
		id: "quiz-1",
		title: "Capitais",
		description: "Capitais do mundo\nsegunda linha",
		coverImageUrl: null,
		visibility: "private",
		status: "published",
		hasUnpublishedChanges: false,
		questionCount: 5,
		updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		trashedAt: null,
		...overrides,
	} as LibraryItemView;
}

const quizzes = [
	anItem(),
	anItem({ id: "quiz-2", title: "Geografia", visibility: "public" }),
	anItem({ id: "quiz-3", title: "Rascunho", status: "draft" }),
];

async function renderDialog(
	items: LibraryItemView[] | undefined = quizzes,
	onPick = vi.fn(),
	onClose = vi.fn(),
) {
	const user = userEvent.setup();
	renderWithRouter(
		<SelectQuizDialog
			open
			quizzes={items}
			ownerName="Ana"
			onPick={onPick}
			onClose={onClose}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Selecionar kahoot",
	});
	return { user, dialog, onPick, onClose };
}

describe("SelectQuizDialog (spec 038, RN-04 to RN-06)", () => {
	it("lists published quizzes with cover, count, description, owner, visibility and age", async () => {
		const { user, dialog, onPick } = await renderDialog();

		const options = within(dialog).getAllByRole("button", {
			name: /Capitais|Geografia/,
		});
		expect(options).toHaveLength(2);
		expect(within(dialog).queryByText("Rascunho")).toBeNull();
		const first = options[0] as HTMLElement;
		expect(first).toHaveTextContent("5 perguntas");
		expect(first).toHaveTextContent("Capitais do mundo");
		expect(first).not.toHaveTextContent("segunda linha");
		expect(first).toHaveTextContent("Ana");
		expect(first).toHaveTextContent("Privado");
		expect(first).toHaveTextContent("há 2 horas");

		await user.click(first);
		expect(onPick).toHaveBeenCalledWith(
			expect.objectContaining({ id: "quiz-1", title: "Capitais" }),
		);
	});

	it("searches without case or accents; Nenhum quiz encontrado.", async () => {
		const { user, dialog } = await renderDialog([
			anItem({ title: "Geografia Física" }),
		]);
		const search = within(dialog).getByRole("searchbox", {
			name: "Pesquisar kahoots",
		});

		await user.type(search, "FISICA");
		expect(within(dialog).getByText("Geografia Física")).toBeVisible();
		await user.clear(search);
		await user.type(search, "xyz");
		expect(within(dialog).getByText("Nenhum quiz encontrado.")).toBeVisible();
	});

	it("without quizzes offers Ir para a biblioteca", async () => {
		const { dialog } = await renderDialog([anItem({ status: "draft" })]);

		expect(
			within(dialog).getByText(
				"Você ainda não tem quizzes salvos para atribuir.",
			),
		).toBeVisible();
		expect(
			within(dialog).getByText("Ir para a biblioteca").closest("a"),
		).toHaveAttribute("href", "/library?section=recent");
	});

	it("Fechar creates nothing", async () => {
		const { user, dialog, onPick, onClose } = await renderDialog();

		await user.click(within(dialog).getByRole("button", { name: "Fechar" }));

		expect(onClose).toHaveBeenCalled();
		expect(onPick).not.toHaveBeenCalled();
	});
});
