import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ReportListItemData } from "@/lib/api-types";
import { reportDateLabel } from "@/lib/report-labels";
import { renderWithRouter } from "@/testing/render-with-router";

import { ReportList, ReportListError } from "./report-list";
import type { ReportItemActions } from "./report-list-item";
import { ReportSelectionBar } from "./report-selection-bar";

const report = (
	overrides: Partial<ReportListItemData> = {},
): ReportListItemData => ({
	gameId: "game-1",
	name: "Bom de Bíblia (Geral)",
	coverUrl: null,
	questionCount: 15,
	participantCount: 25,
	accuracyPercent: 38,
	endedEarly: false,
	endedAt: "2026-06-13T17:56:00.000Z",
	trashedAt: null,
	quizId: "quiz-1",
	canPlayAgain: true,
	...overrides,
});

function fakeActions(): ReportItemActions {
	return {
		onPlayAgain: vi.fn(),
		onRename: vi.fn(),
		onMoveToTrash: vi.fn(),
		onRestore: vi.fn(),
		onDeletePermanently: vi.fn(),
	};
}

function renderList(
	props: Partial<Parameters<typeof ReportList>[0]> & {
		items: ReportListItemData[];
	},
) {
	const actions = fakeActions();
	const onSelectedChange = vi.fn();
	const onShowMore = vi.fn();
	renderWithRouter(
		<ReportList
			total={props.items.length}
			section="reports"
			selected={new Set()}
			onSelectedChange={onSelectedChange}
			actions={actions}
			onShowMore={onShowMore}
			{...props}
		/>,
	);
	return { actions, onSelectedChange, onShowMore, user: userEvent.setup() };
}

const row = async (name: string) =>
	(await screen.findByText(name)).closest("li") as HTMLElement;

describe("ReportList (spec 015)", () => {
	it("shows each report's cover, name, participants, accuracy and end", async () => {
		renderList({ items: [report()] });

		const item = within(await row("Bom de Bíblia (Geral)"));

		expect(
			item.getByRole("link", { name: "Bom de Bíblia (Geral)" }),
		).toHaveAttribute("href", "/reports/game-1");
		expect(item.getByText("15 perguntas")).toBeInTheDocument();
		expect(item.getByText("Ao vivo")).toBeInTheDocument();
		expect(item.getByText("Participantes:").parentElement).toHaveTextContent(
			"25",
		);
		expect(item.getByText("38%")).toBeInTheDocument();
		expect(
			item.getByText(reportDateLabel("2026-06-13T17:56:00.000Z")),
		).toBeInTheDocument();
		expect(item.queryByText("Encerrada antes do fim")).not.toBeInTheDocument();
	});

	it("marks a game that ended early, with a dash for no accuracy", async () => {
		renderList({
			items: [report({ endedEarly: true, accuracyPercent: null })],
		});

		const item = within(await row("Bom de Bíblia (Geral)"));

		expect(item.getByText("Encerrada antes do fim")).toBeInTheDocument();
		expect(item.getByText("—")).toBeInTheDocument();
	});

	it("the row's menu offers open, play again, rename and trash", async () => {
		const item = report();
		const { actions, user } = renderList({ items: [item] });

		await user.click(
			await screen.findByRole("button", {
				name: "Ações para Bom de Bíblia (Geral)",
			}),
		);

		expect(
			(await screen.findAllByRole("menuitem")).map(
				(entry) => entry.textContent,
			),
		).toEqual([
			"Abrir relatório",
			"Jogar de novo",
			"Renomear",
			"Mover para a lixeira",
		]);
		await user.click(screen.getByRole("menuitem", { name: "Renomear" }));
		expect(actions.onRename).toHaveBeenCalledWith(item);
	});

	it("hides play again when the quiz cannot be played", async () => {
		const { user } = renderList({
			items: [report({ canPlayAgain: false, quizId: null })],
		});

		await user.click(await screen.findByRole("button", { name: /Ações para/ }));

		expect(
			await screen.findByRole("menuitem", { name: "Abrir relatório" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: "Jogar de novo" }),
		).not.toBeInTheDocument();
	});

	it("the trash offers restore and delete, and the report does not open", async () => {
		const item = report({ trashedAt: "2026-06-14T10:00:00.000Z" });
		const { actions, user } = renderList({ items: [item], section: "trash" });

		await user.click(await screen.findByRole("button", { name: /Ações para/ }));

		expect(
			(await screen.findAllByRole("menuitem")).map(
				(entry) => entry.textContent,
			),
		).toEqual(["Restaurar", "Excluir definitivamente"]);
		expect(
			screen.queryByRole("link", { name: "Bom de Bíblia (Geral)" }),
		).not.toBeInTheDocument();
		await user.click(
			screen.getByRole("menuitem", { name: "Excluir definitivamente" }),
		);
		expect(actions.onDeletePermanently).toHaveBeenCalledWith(item);
	});

	it("the header checkbox selects every row shown", async () => {
		const items = [
			report(),
			report({ gameId: "game-2", name: "Capitais" }),
			report({ gameId: "game-3", name: "Química" }),
		];
		const { onSelectedChange, user } = renderList({ items });

		await user.click(
			await screen.findByRole("checkbox", { name: "Selecionar todos" }),
		);
		expect(onSelectedChange).toHaveBeenLastCalledWith(
			new Set(["game-1", "game-2", "game-3"]),
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Selecionar Capitais" }),
		);
		expect(onSelectedChange).toHaveBeenLastCalledWith(new Set(["game-2"]));
	});

	it("unchecking the header clears the selection", async () => {
		const items = [report(), report({ gameId: "game-2", name: "Capitais" })];
		const { onSelectedChange, user } = renderList({
			items,
			selected: new Set(["game-1", "game-2"]),
		});

		const all = await screen.findByRole("checkbox", {
			name: "Selecionar todos",
		});
		expect(all).toBeChecked();
		await user.click(all);

		expect(onSelectedChange).toHaveBeenLastCalledWith(new Set());
	});

	it("'Mostrar mais' shows while there are more", async () => {
		const { onShowMore, user } = renderList({ items: [report()], total: 25 });

		await user.click(
			await screen.findByRole("button", { name: "Mostrar mais" }),
		);

		expect(onShowMore).toHaveBeenCalledOnce();
	});

	it("no 'Mostrar mais' when everything is listed", async () => {
		renderList({ items: [report()], total: 1 });

		await row("Bom de Bíblia (Geral)");
		expect(
			screen.queryByRole("button", { name: "Mostrar mais" }),
		).not.toBeInTheDocument();
	});

	it("error state with 'Tentar novamente'", async () => {
		const onRetry = vi.fn();
		renderWithRouter(<ReportListError onRetry={onRetry} />);

		expect(
			await screen.findByText("Não foi possível carregar os relatórios."),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar novamente" }),
		);
		expect(onRetry).toHaveBeenCalledOnce();
	});
});

describe("ReportSelectionBar (spec 015)", () => {
	const handlers = () => ({
		onMoveToTrash: vi.fn(),
		onRestore: vi.fn(),
		onDeletePermanently: vi.fn(),
		onClear: vi.fn(),
	});

	it("shows nothing without a selection", () => {
		const { container } = render(
			<ReportSelectionBar count={0} section="reports" {...handlers()} />,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("the action for the selected shows with one marked", async () => {
		const props = handlers();
		renderWithRouter(
			<ReportSelectionBar count={3} section="reports" {...props} />,
		);

		const bar = within(
			await screen.findByRole("region", { name: "Relatórios selecionados" }),
		);
		expect(bar.getByText("3 selecionados")).toBeInTheDocument();
		await userEvent.click(
			bar.getByRole("button", { name: "Mover para a lixeira" }),
		);

		expect(props.onMoveToTrash).toHaveBeenCalledOnce();
	});

	it("in the trash, restores or deletes the selected", async () => {
		const props = handlers();
		renderWithRouter(
			<ReportSelectionBar count={1} section="trash" {...props} />,
		);

		const bar = within(
			await screen.findByRole("region", { name: "Relatórios selecionados" }),
		);
		expect(bar.getByText("1 selecionado")).toBeInTheDocument();
		await userEvent.click(bar.getByRole("button", { name: "Restaurar" }));
		await userEvent.click(
			bar.getByRole("button", { name: "Excluir definitivamente" }),
		);

		expect(props.onRestore).toHaveBeenCalledOnce();
		expect(props.onDeletePermanently).toHaveBeenCalledOnce();
		expect(
			bar.queryByRole("button", { name: "Mover para a lixeira" }),
		).not.toBeInTheDocument();
	});
});
