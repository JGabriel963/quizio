import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import { CreateQuizContext } from "@/components/layout/create-quiz-context";
import { renderWithRouter } from "@/testing/render-with-router";

async function renderShell({ creating = false } = {}) {
	const createQuiz = vi.fn();
	renderWithRouter(
		<CreateQuizContext value={{ createQuiz, creating }}>
			<AppShell pathname="/">
				<p>Conteúdo</p>
			</AppShell>
		</CreateQuizContext>,
	);
	await screen.findByRole("navigation", { name: "Navegação principal" });
	return { createQuiz, user: userEvent.setup() };
}

// `hidden`: while the sheet is open the page behind it is out of the tree.
const navToggle = () =>
	screen.getByRole("button", { name: "Navegação", hidden: true });

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

	it("opens the main nav as a sheet on narrow screens and closes it after navigating", async () => {
		const { user } = await renderShell();

		expect(navToggle()).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("dialog")).toBeNull();

		await user.click(navToggle());
		const sheet = await screen.findByRole("dialog", { name: "Navegação" });
		expect(navToggle()).toHaveAttribute("aria-expanded", "true");

		await user.click(within(sheet).getByRole("link", { name: "Biblioteca" }));
		expect(navToggle()).toHaveAttribute("aria-expanded", "false");
	});

	it("closes the sheet with its X", async () => {
		const { user } = await renderShell();

		await user.click(navToggle());
		await user.click(
			await screen.findByRole("button", { name: "Fechar navegação" }),
		);

		expect(navToggle()).toHaveAttribute("aria-expanded", "false");
	});

	it("Criar creates a quiz from the top bar", async () => {
		const { createQuiz, user } = await renderShell();

		await user.click(screen.getByRole("button", { name: "Criar" }));

		expect(createQuiz).toHaveBeenCalledOnce();
	});

	it("Criar is disabled while creating", async () => {
		await renderShell({ creating: true });

		expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();
	});
});
