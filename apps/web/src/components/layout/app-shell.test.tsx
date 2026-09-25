import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizContext } from "@/components/layout/create-quiz-context";
import { renderWithRouter } from "@/testing/render-with-router";

async function renderShell() {
	const openCreateQuiz = vi.fn();
	renderWithRouter(
		<CreateQuizContext value={{ openCreateQuiz }}>
			<AppShell pathname="/">
				<p>Conteúdo</p>
			</AppShell>
		</CreateQuizContext>,
	);
	await screen.findByRole("navigation", { name: "Navegação principal" });
	return { openCreateQuiz, user: userEvent.setup() };
}

const navToggle = () => screen.getByRole("button", { name: "Navegação" });

describe("AppShell", () => {
	it("keeps the top bar free of navigation links", async () => {
		await renderShell();

		const topBar = screen.getByRole("banner");
		// The brand is the only link allowed here; the areas live in the sidebar.
		expect(
			within(topBar).getByRole("link", { name: "Quizio" }),
		).toBeInTheDocument();
		for (const area of ["Início", "Biblioteca", "Relatórios"]) {
			expect(
				within(topBar).queryByRole("link", { name: area }),
			).not.toBeInTheDocument();
		}
		expect(
			within(topBar).getByRole("searchbox", {
				name: "Pesquisar nos meus quizzes",
			}),
		).toBeInTheDocument();
		expect(
			within(topBar).getByRole("button", { name: "Criar" }),
		).toBeInTheDocument();
	});

	it("toggles the main nav on narrow screens and closes it after navigating", async () => {
		const { user } = await renderShell();

		expect(navToggle()).toHaveAttribute("aria-expanded", "false");

		await user.click(navToggle());
		expect(navToggle()).toHaveAttribute("aria-expanded", "true");

		await user.click(screen.getByRole("link", { name: "Biblioteca" }));
		expect(navToggle()).toHaveAttribute("aria-expanded", "false");
	});

	it("opens the create dialog from the top bar", async () => {
		const { openCreateQuiz, user } = await renderShell();

		await user.click(screen.getByRole("button", { name: "Criar" }));

		expect(openCreateQuiz).toHaveBeenCalledOnce();
	});
});
