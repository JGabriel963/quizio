import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { ReportEmptyState } from "./report-empty-state";

describe("ReportEmptyState (spec 015)", () => {
	it("explains where reports come from when there is none", async () => {
		renderWithRouter(<ReportEmptyState kind="reports" />);

		expect(
			await screen.findByText("Você ainda não tem relatórios."),
		).toBeInTheDocument();
		expect(
			screen.getByText(/depois de cada partida ao vivo/),
		).toBeInTheDocument();
		// A link drawn as a button.
		expect(
			screen.getByText("Ir para a biblioteca").closest("a"),
		).toHaveAttribute("href", "/library?section=recent");
	});

	it("tells that nothing was found for the term", async () => {
		renderWithRouter(<ReportEmptyState kind="search" search="xyz" />);

		expect(
			await screen.findByText("Nada encontrado para “xyz”."),
		).toBeInTheDocument();
		expect(screen.queryByText("Ir para a biblioteca")).not.toBeInTheDocument();
	});

	it("tells the trash is empty", async () => {
		renderWithRouter(<ReportEmptyState kind="trash" />);

		expect(
			await screen.findByText("A lixeira está vazia."),
		).toBeInTheDocument();
	});
});
