import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LibraryEmptyState } from "./library-empty-state";

describe("LibraryEmptyState", () => {
	it("offers to create the first quiz in an empty library", async () => {
		const onCreate = vi.fn();
		render(<LibraryEmptyState kind="library" onCreate={onCreate} />);

		expect(screen.getByText("Você ainda não tem quizzes.")).toBeInTheDocument();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Criar quiz" }));

		expect(onCreate).toHaveBeenCalledOnce();
	});

	it("shows the empty trash message", () => {
		render(<LibraryEmptyState kind="trash" />);

		expect(screen.getByText("A lixeira está vazia.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Criar quiz" })).toBeNull();
	});

	it("shows the no results message for a search", () => {
		render(<LibraryEmptyState kind="search" search="história" />);

		expect(
			screen.getByText("Nenhum quiz encontrado para “história”."),
		).toBeInTheDocument();
	});
});
