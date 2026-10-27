import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SharedQuizCardData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { SharedQuizzesTab } from "./shared-quizzes-tab";

function aCard(
	overrides: Partial<SharedQuizCardData> = {},
): SharedQuizCardData {
	return {
		sharedQuizId: "share-1",
		quizId: "capitais",
		title: "Capitais",
		coverUrl: null,
		questionCount: 24,
		visibility: "unlisted",
		owner: { userId: "ana", name: "Ana" },
		sharedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
		games: 2,
		ownedByViewer: false,
		canUnshare: false,
		...overrides,
	} as SharedQuizCardData;
}

function renderTab(
	props: Partial<Parameters<typeof SharedQuizzesTab>[0]> = {},
) {
	const user = userEvent.setup();
	const handlers = {
		onSortChange: vi.fn(),
		onShare: vi.fn(),
		onLoadMore: vi.fn(),
	};
	renderWithRouter(
		<SharedQuizzesTab
			items={[aCard()]}
			sort="recent"
			canShare={false}
			actions={{
				groupId: "g1",
				onDuplicate: async () => {},
				onUnshare: async () => {},
			}}
			{...handlers}
			{...props}
		/>,
	);
	return { user, ...handlers };
}

describe("SharedQuizzesTab (spec 037, RN-14, RN-15)", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("shows Kahoots as cards with cover, question count, title and owner", async () => {
		renderTab();

		expect(
			await screen.findByRole("heading", { name: "Kahoots" }),
		).toBeVisible();
		const card = screen.getByRole("article");
		expect(card).toHaveTextContent("Quiz");
		expect(card).toHaveTextContent("24 perguntas");
		expect(card).toHaveTextContent("Capitais");
		expect(card).toHaveTextContent("Ana");
		expect(
			within(card).getByRole("link", { name: "Capitais" }),
		).toHaveAttribute("href", "/groups/g1/quizzes/capitais");
		expect(screen.queryByRole("button", { name: "Compart." })).toBeNull();
	});

	it("the list has Título with N partidas, Criado por, Visibilidade and Compartilhados, remembered", async () => {
		const { user } = renderTab();

		await user.click(await screen.findByRole("button", { name: "Lista" }));

		const table = screen.getByRole("table", { name: "Kahoots compartilhados" });
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((cell) => cell.textContent),
		).toEqual(["Título", "Criado por", "Visibilidade", "Compartilhados"]);
		const row = within(table).getAllByRole("row")[1] as HTMLElement;
		expect(row).toHaveTextContent("Capitais");
		expect(row).toHaveTextContent("2 partidas");
		expect(row).toHaveTextContent("Não listado");
		expect(within(row).getByRole("img", { name: "Ana" })).toBeInTheDocument();
		expect(window.localStorage.getItem("quizio:groups:shared-view")).toBe(
			"list",
		);
	});

	it("Ordenar por changes the sort", async () => {
		const { user, onSortChange } = renderTab();

		await user.click(
			await screen.findByRole("combobox", { name: "Ordenar por:" }),
		);
		await user.click(await screen.findByRole("option", { name: "Nome (a-z)" }));

		expect(onSortChange).toHaveBeenCalledWith("nameAsc");
	});

	it("Mostrar mais asks for the next 20", async () => {
		const { user, onLoadMore } = renderTab({ hasMore: true });

		await user.click(
			await screen.findByRole("button", { name: "Mostrar mais" }),
		);

		expect(onLoadMore).toHaveBeenCalled();
	});

	it("empty: the text with Compart. for who can share, without it otherwise", async () => {
		const { user, onShare } = renderTab({ items: [], canShare: true });

		expect(
			await screen.findByText(
				"Ainda não há kahoots compartilhados neste grupo.",
			),
		).toBeVisible();
		const buttons = screen.getAllByRole("button", { name: "Compart." });
		expect(buttons).toHaveLength(2);
		await user.click(buttons[1] as HTMLElement);
		expect(onShare).toHaveBeenCalled();
	});
});
