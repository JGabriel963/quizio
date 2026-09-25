import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GlobalSearch } from "@/components/layout/global-search";

function renderSearch() {
	const onSearch = vi.fn();
	render(<GlobalSearch onSearch={onSearch} />);
	return { onSearch, user: userEvent.setup() };
}

describe("GlobalSearch", () => {
	it("searches the creator's own quizzes, not public content", () => {
		renderSearch();

		expect(
			screen.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" }),
		).toBeInTheDocument();
	});

	it("submits the typed text without surrounding spaces", async () => {
		const { onSearch, user } = renderSearch();

		await user.type(
			screen.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" }),
			"  algebra  {Enter}",
		);

		expect(onSearch).toHaveBeenCalledExactlyOnceWith("algebra");
	});

	it.each([["{Enter}"], ["   {Enter}"]])(
		"does not search for %s",
		async (typed) => {
			const { onSearch, user } = renderSearch();

			await user.type(
				screen.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" }),
				typed,
			);

			expect(onSearch).not.toHaveBeenCalled();
		},
	);
});
