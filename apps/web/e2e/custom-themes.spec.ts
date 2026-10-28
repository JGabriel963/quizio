import { expect, type Page, test } from "@playwright/test";

import { createQuizInEditor, expectSaved, lobbyPin, signUp } from "./support";

const canvas = (page: Page) => page.locator('[data-slot="editor-canvas"]');
const shownTheme = (page: Page) =>
	page.locator('[data-slot="game-screen"]').first();

/** "Temas" from the side rail, or from the ⋮ where the rail does not fit. */
async function openThemes(page: Page, isMobile: boolean) {
	if (isMobile) {
		await page
			.getByRole("button", { name: "Propriedades da pergunta" })
			.click();
		await page.getByRole("menuitem", { name: "Temas" }).click();
	} else {
		await page
			.getByRole("toolbar", { name: "Painéis do editor" })
			.getByRole("button", { name: "Temas" })
			.click();
	}
}

/** A quiz with one complete question, open in the editor. */
async function quizWithAQuestion(page: Page) {
	await signUp(page);
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill("Capitais");
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Capital do Brasil?");
	await page
		.getByRole("textbox", { name: "Resposta 1", exact: true })
		.fill("Brasília");
	await page
		.getByRole("textbox", { name: "Resposta 2", exact: true })
		.fill("Rio de Janeiro");
	await page.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
}

/** A color of a row's popover (Plano de fundo, Cor de contraste), by its code. */
async function pickColor(page: Page, row: string, hex: string) {
	await page.getByRole("button", { name: row, exact: true }).click();
	const popover = page.getByRole("dialog", { name: row, exact: true });
	await popover.getByRole("radio", { name: hex }).click();
	await page.keyboard.press("Escape");
	await expect(popover).toBeHidden();
}

/** "Crie seu tema": the name, the Montanhas pattern and a yellow accent. */
async function createTheme(page: Page, isMobile: boolean) {
	await page.getByRole("button", { name: "Criar tema" }).click();
	const dialog = page.getByRole("dialog", { name: "Crie seu tema" });
	await expect(dialog).toBeVisible();
	await dialog.getByRole("textbox", { name: "Nome" }).fill("Escola Azul");
	await dialog
		.getByRole("button", { name: "Plano de fundo", exact: true })
		.click();
	const background = page.getByRole("dialog", { name: "Plano de fundo" });
	await background.getByRole("radio", { name: "Montanhas" }).click();
	await page.keyboard.press("Escape");
	await expect(background).toBeHidden();
	await pickColor(page, "Cor de contraste", "#FBD848");
	if (isMobile) {
		// CA-24: one preview at a time, and the page never scrolls sideways.
		await dialog.getByRole("button", { name: "Mostrar o pódio" }).click();
		await expect(dialog.locator('[aria-label="Prévia: Pódio"]')).toBeVisible();
		await expect(dialog.locator('[aria-label="Prévia: Lobby"]')).toBeHidden();
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
	}
	await dialog.getByRole("button", { name: "Salvar" }).click();
	await expect(dialog).toBeHidden();
}

test.describe("temas personalizados (spec 043)", () => {
	test("criar, aplicar, editar e excluir um tema", async ({
		page,
		isMobile,
	}) => {
		await quizWithAQuestion(page);
		await openThemes(page, isMobile);

		// CA-02: created, applied to the quiz and kept after a reload.
		await createTheme(page, isMobile);
		await expect(canvas(page)).toHaveAttribute("data-theme", "custom");
		await expect(
			page.getByRole("radio", { name: "Escola Azul" }),
		).toHaveAttribute("aria-checked", "true");
		if (isMobile) {
			// The sheet is modal: the header's "Salvo" shows once it closes.
			await page.getByRole("button", { name: "Fechar temas" }).click();
		}
		await expectSaved(page);
		await page.reload();
		await expect(canvas(page)).toHaveAttribute("data-theme", "custom");
		await expect
			.poll(() =>
				canvas(page).evaluate((node) =>
					(node as HTMLElement).style.getPropertyValue("--game-accent"),
				),
			)
			.toBe("#fbd848");

		// CA-13: editing the accent changes the quiz.
		await openThemes(page, isMobile);
		await page
			.getByRole("button", { name: "Mais opções do tema Escola Azul" })
			.click();
		await page.getByRole("menuitem", { name: "Editar" }).click();
		const editing = page.getByRole("dialog", { name: "Editar tema" });
		await expect(editing).toBeVisible();
		await pickColor(page, "Cor de contraste", "#3C8628");
		await editing.getByRole("button", { name: "Salvar" }).click();
		await expect(editing).toBeHidden();
		await expect
			.poll(() =>
				canvas(page).evaluate((node) =>
					(node as HTMLElement).style.getPropertyValue("--game-accent"),
				),
			)
			.toBe("#3c8628");

		// CA-15: deleting it sends the quiz back to standard.
		await page
			.getByRole("button", { name: "Mais opções do tema Escola Azul" })
			.click();
		await page.getByRole("menuitem", { name: "Excluir" }).click();
		const confirm = page.getByRole("alertdialog", {
			name: "Excluir o tema Escola Azul?",
		});
		await expect(
			confirm.getByText("1 quiz usa este tema e voltará para o tema Padrão."),
		).toBeVisible();
		await confirm.getByRole("button", { name: "Excluir" }).click();
		await expect(page.getByRole("radio", { name: "Escola Azul" })).toHaveCount(
			0,
		);
		await expect(canvas(page)).toHaveAttribute("data-theme", "standard");
	});

	test("a partida ao vivo usa o tema personalizado", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the lobby is the host's screen");
		await quizWithAQuestion(page);
		await openThemes(page, false);
		await createTheme(page, false);
		await expectSaved(page);

		await page.getByRole("button", { name: "Salvar", exact: true }).click();
		const ready = page.getByRole("dialog", { name: "O quiz está pronto" });
		await ready.getByRole("button", { name: /Organizar ao vivo/ }).click();

		// CA-05 (without a logo here) and RN-24: the lobby wears the copied look.
		await lobbyPin(page);
		await expect(shownTheme(page)).toHaveAttribute("data-theme", "custom");
		await expect(page.getByText("Quizio!").first()).toBeVisible();
	});
});
