import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ReportHeaderData } from "@/lib/api-types";
import { reportDateLabel } from "@/lib/report-labels";
import { renderWithRouter } from "@/testing/render-with-router";

import { ReportHeader } from "./report-header";

const header = (
	overrides: Partial<ReportHeaderData> = {},
): ReportHeaderData => ({
	gameId: "game-1",
	name: "Bom de Bíblia (Geral)",
	coverUrl: null,
	startedAt: "2026-06-13T17:45:00.000Z",
	endedAt: "2026-06-13T17:56:00.000Z",
	endedEarly: false,
	questionCount: 15,
	playedCount: 15,
	participantCount: 25,
	quizId: "quiz-1",
	canPlayAgain: true,
	...overrides,
});

function renderHeader(
	overrides: Partial<ReportHeaderData> = {},
	onRename = vi.fn().mockResolvedValue(undefined),
) {
	const onMoveToTrash = vi.fn();
	renderWithRouter(
		<ReportHeader
			header={header(overrides)}
			hostName="João Gabriel"
			tab="summary"
			onRename={onRename}
			onMoveToTrash={onMoveToTrash}
		/>,
	);
	return { onRename, onMoveToTrash, user: userEvent.setup() };
}

const heading = () => screen.findByRole("heading", { level: 1 });
const field = () => screen.getByRole("textbox", { name: "Nome do relatório" });

describe("ReportHeader (spec 015)", () => {
	it("shows the name, the start, the host and the three tabs with counts", async () => {
		renderHeader();

		expect(await heading()).toHaveTextContent("Bom de Bíblia (Geral)");
		expect(screen.getByText("Relatório")).toBeInTheDocument();
		expect(screen.getByText("Ao vivo")).toBeInTheDocument();
		expect(
			screen.getByText(reportDateLabel("2026-06-13T17:45:00.000Z")),
		).toBeInTheDocument();
		expect(screen.getByText("Organizado por João Gabriel")).toBeInTheDocument();

		const tabs = within(
			screen.getByRole("navigation", { name: "Partes do relatório" }),
		).getAllByRole("link");
		expect(tabs.map((tab) => tab.textContent)).toEqual([
			"Resumo",
			"Participantes(25)",
			"Perguntas(15)",
		]);
		expect(tabs[0]).toHaveAttribute("aria-current", "page");
		expect(tabs[2]).toHaveAttribute("href", "/reports/game-1?tab=questions");
		expect(
			screen.queryByText("Encerrada antes do fim"),
		).not.toBeInTheDocument();
	});

	it("marks a game that ended early", async () => {
		renderHeader({ endedEarly: true, playedCount: 7 });

		expect(
			await screen.findByText("Encerrada antes do fim"),
		).toBeInTheDocument();
		// The tab counts the questions that were played.
		expect(screen.getByRole("link", { name: /Perguntas/ })).toHaveTextContent(
			"(7)",
		);
	});

	it("the pencil turns the name into a field", async () => {
		const { user, onRename } = renderHeader();

		await user.click(
			await screen.findByRole("button", { name: "Renomear relatório" }),
		);
		expect(field()).toHaveValue("Bom de Bíblia (Geral)");

		await user.clear(field());
		await user.type(field(), "  Turma A ");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(onRename).toHaveBeenCalledWith("Turma A");
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("cancelling keeps the name", async () => {
		const { user, onRename } = renderHeader();

		await user.click(
			await screen.findByRole("button", { name: "Renomear relatório" }),
		);
		await user.clear(field());
		await user.type(field(), "Outro");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onRename).not.toHaveBeenCalled();
		expect(await heading()).toHaveTextContent("Bom de Bíblia (Geral)");
	});

	it("tells why the name is not accepted", async () => {
		const { user, onRename } = renderHeader();

		await user.click(
			await screen.findByRole("button", { name: "Renomear relatório" }),
		);
		await user.clear(field());
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Dê um nome ao relatório.",
		);

		await user.type(field(), "a".repeat(96));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(screen.getByRole("alert")).toHaveTextContent(
			"O nome deve ter no máximo 95 caracteres.",
		);
		expect(onRename).not.toHaveBeenCalled();
		// Still the field: nothing was thrown away.
		expect(field()).toHaveValue("a".repeat(96));
	});

	it("a failed rename keeps the old name and warns", async () => {
		const { user } = renderHeader(
			{},
			vi.fn().mockRejectedValue(new Error("offline")),
		);

		await user.click(
			await screen.findByRole("button", { name: "Renomear relatório" }),
		);
		await user.clear(field());
		await user.type(field(), "Turma A");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível renomear o relatório. Tente novamente.",
		);
		expect(await heading()).toHaveTextContent("Bom de Bíblia (Geral)");
	});

	it("the options offer the quiz and the trash", async () => {
		const { user, onMoveToTrash } = renderHeader();

		await user.click(
			await screen.findByRole("button", { name: "Opções de relatório" }),
		);

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Ver quiz", "Mover para a lixeira"]);
		await user.click(
			screen.getByRole("menuitem", { name: "Mover para a lixeira" }),
		);
		expect(onMoveToTrash).toHaveBeenCalledOnce();
	});

	it("the options hide 'Ver quiz' without a quiz", async () => {
		const { user } = renderHeader({ quizId: null, canPlayAgain: false });

		await user.click(
			await screen.findByRole("button", { name: "Opções de relatório" }),
		);

		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Mover para a lixeira"]);
	});
});
