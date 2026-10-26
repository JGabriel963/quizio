import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GroupAssignmentData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { GroupAssignmentsTab } from "./group-assignments-tab";

const DAY = 24 * 60 * 60 * 1000;

function anAssignment(
	overrides: Partial<GroupAssignmentData> = {},
): GroupAssignmentData {
	return {
		postId: "post-1",
		gameId: "game-1",
		name: "Capitais",
		questionCount: 5,
		coverUrl: null,
		ownerName: "Ana",
		remainingMs: 3 * DAY,
		assignedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
		assignedBy: { userId: "ana", name: "Ana" },
		canSeeReport: false,
		canDelete: false,
		...overrides,
	} as GroupAssignmentData;
}

function renderTab(
	props: Partial<Parameters<typeof GroupAssignmentsTab>[0]> = {},
) {
	const user = userEvent.setup();
	const onSortChange = vi.fn();
	const onAssign = vi.fn();
	renderWithRouter(
		<GroupAssignmentsTab
			items={[anAssignment()]}
			sort="recent"
			onSortChange={onSortChange}
			canAssign={false}
			onAssign={onAssign}
			origin="https://quizio.app"
			onDelete={async () => {}}
			{...props}
		/>,
	);
	return { user, onSortChange, onAssign };
}

describe("GroupAssignmentsTab (spec 038)", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("cards with Kahoot, time left, cover, title and who assigned", async () => {
		renderTab();

		expect(
			await screen.findByRole("heading", { name: "Kahoots" }),
		).toBeVisible();
		const card = screen.getByRole("article");
		expect(card).toHaveTextContent("Kahoot");
		expect(card).toHaveTextContent("3 dias");
		expect(card).toHaveTextContent("5 perguntas");
		expect(card).toHaveTextContent("Capitais");
		expect(card).toHaveTextContent("Ana");
		// A member sees neither Atribuir nor the ⋮ (CA-13).
		expect(screen.queryByRole("button", { name: "Atribuir" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Opções da publicação" }),
		).toBeNull();
	});

	it("a card opens the activity in a new tab", async () => {
		renderTab();

		const link = await screen.findByRole("link", { name: /Capitais/ });
		expect(link).toHaveAttribute(
			"href",
			"https://quizio.app/assignment/game-1",
		);
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("the ⋮ shows for who may manage the post", async () => {
		renderTab({
			items: [anAssignment({ canSeeReport: true, canDelete: true })],
		});

		expect(
			await screen.findByRole("button", { name: "Opções da publicação" }),
		).toBeVisible();
	});

	it("list with Título, Atribuído por, Prazo and Atribuído", async () => {
		const { user } = renderTab();

		await user.click(await screen.findByRole("button", { name: "Lista" }));

		const table = screen.getByRole("table", { name: "Atribuições do grupo" });
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((cell) => cell.textContent),
		).toEqual(["Título", "Atribuído por", "Prazo", "Atribuído"]);
		const [, row] = within(table).getAllByRole("row");
		expect(row).toHaveTextContent("Capitais");
		expect(within(row).getByLabelText("Ana")).toBeInTheDocument();
		expect(row).toHaveTextContent("3 dias");
		expect(row).toHaveTextContent("há 3 minutos");
		expect(within(row).getByRole("link", { name: /Capitais/ })).toHaveAttribute(
			"target",
			"_blank",
		);
	});

	it("the view choice is remembered", async () => {
		const first = renderTab();
		await first.user.click(
			await screen.findByRole("button", { name: "Lista" }),
		);
		document.body.innerHTML = "";

		renderTab();

		expect(
			await screen.findByRole("table", { name: "Atribuições do grupo" }),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("Classificar por changes the order", async () => {
		const { user, onSortChange } = renderTab();

		await user.click(
			await screen.findByRole("combobox", { name: "Classificar por" }),
		);
		await user.click(
			await screen.findByRole("option", { name: "Prazo mais próximo" }),
		);

		expect(onSortChange).toHaveBeenCalledWith("deadline");
	});

	it("empty, with Atribuir for who may assign", async () => {
		const { user, onAssign } = renderTab({ items: [], canAssign: true });

		expect(
			await screen.findByText(
				"Nenhuma atividade foi atribuída a este grupo ainda.",
			),
		).toBeVisible();
		const buttons = screen.getAllByRole("button", { name: "Atribuir" });
		await user.click(buttons[buttons.length - 1] as HTMLElement);
		expect(onAssign).toHaveBeenCalled();
	});

	it("empty, without Atribuir for who may not", async () => {
		renderTab({ items: [] });

		expect(
			await screen.findByText(
				"Nenhuma atividade foi atribuída a este grupo ainda.",
			),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Atribuir" })).toBeNull();
	});
});
