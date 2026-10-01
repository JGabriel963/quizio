import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { EditorUnavailable } from "./editor-unavailable";

describe("EditorUnavailable", () => {
	it("loading shows the editor skeleton", async () => {
		renderWithRouter(<EditorUnavailable state={{ kind: "loading" }} />);

		expect(
			await screen.findByRole("status", { name: "Carregando o editor" }),
		).toBeInTheDocument();
	});

	it("not found says Quiz não encontrado", async () => {
		renderWithRouter(<EditorUnavailable state={{ kind: "not-found" }} />);

		expect(
			await screen.findByRole("heading", { name: "Quiz não encontrado" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Voltar para a biblioteca" }),
		).toHaveAttribute("href", "/library?section=recent");
	});

	it("a trashed quiz links to the trash section", async () => {
		renderWithRouter(<EditorUnavailable state={{ kind: "trash" }} />);

		expect(
			await screen.findByRole("heading", { name: "Este quiz está na lixeira" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Ir para a lixeira" }),
		).toHaveAttribute("href", "/library?section=trash");
	});

	it("an error offers to retry", async () => {
		const onRetry = vi.fn();
		renderWithRouter(<EditorUnavailable state={{ kind: "error", onRetry }} />);

		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Tentar novamente" }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
