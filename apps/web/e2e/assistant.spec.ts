import { expect, type Page, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { signUp } from "./support";

// The E2E server runs with AI_PROVIDER=fake (playwright.config.ts): the
// assistant always answers three questions about the solar system.

const assistant = (page: Page) =>
	page.getByRole("dialog", { name: "Crie com o Assistente" });
const questionItems = (page: Page) =>
	page.getByRole("list", { name: "Perguntas" }).getByRole("listitem");

/** A PDF that holds an exercise list, as a teacher would send. */
async function exerciseListPdf(): Promise<Buffer> {
	const document = await PDFDocument.create();
	const font = await document.embedFont(StandardFonts.Helvetica);
	const page = document.addPage([595, 842]);
	const lines = [
		"Quiz de Historia Geral",
		"1. Qual civilizacao desenvolveu a escrita cuneiforme?",
		"a) Maia",
		"b) Fenicia",
		"c) Sumerios",
		"d) Egipcia",
		"2. Em que ano caiu o Imperio Romano do Ocidente?",
		"a) 800",
		"b) 27 a.C.",
		"c) 1453",
		"d) 476",
		"Gabarito: 1-c, 2-d",
	];
	lines.forEach((line, index) => {
		page.drawText(line, { x: 40, y: 790 - index * 20, size: 12, font });
	});
	return Buffer.from(await document.save());
}

async function openNewQuiz(page: Page) {
	await page.getByRole("button", { name: "Criar", exact: true }).click();
	await expect(page).toHaveURL(/\/creator\//);
	await expect(
		page.getByRole("dialog", { name: "Criar um novo quiz" }),
	).toBeVisible();
}

test.describe("creation assistant (spec 027)", () => {
	test("creates a quiz from a topic with the assistant", async ({ page }) => {
		await signUp(page);
		await openNewQuiz(page);

		await page.getByRole("button", { name: /Assunto > quiz/ }).click();
		await assistant(page)
			.getByRole("textbox", { name: "Assunto" })
			.fill("Sistema solar");
		await assistant(page).getByRole("button", { name: "Crie" }).click();

		await expect(
			assistant(page).getByText(
				"Suas perguntas estão prontas! Revise-as antes de prosseguir.",
			),
		).toBeVisible();
		await assistant(page)
			.getByRole("checkbox", { name: "Pergunta 2 sobre o sistema solar?" })
			.click();
		await assistant(page)
			.getByRole("button", { name: "Adicionar (1)" })
			.click();

		await expect(assistant(page)).toBeHidden();
		// The blank question of the new quiz gave its place (RN-26).
		await expect(questionItems(page)).toHaveCount(1);
		await expect(questionItems(page).first()).toContainText("feita com IA");
		await expect(page.getByRole("textbox", { name: "Pergunta" })).toHaveText(
			"Pergunta 2 sobre o sistema solar?",
		);

		// The address lost the flag: a reload does not offer the dialog again.
		await page.reload();
		await expect(page.getByRole("textbox", { name: "Pergunta" })).toBeVisible();
		await expect(
			page.getByRole("dialog", { name: "Criar um novo quiz" }),
		).toBeHidden();
	});

	test("shows the credits left and the credits a creation used (spec 045)", async ({
		page,
		isMobile,
	}) => {
		await signUp(page);
		await openNewQuiz(page);

		await page.getByRole("button", { name: /Assunto > quiz/ }).click();
		const options = assistant(page).getByRole("complementary", {
			name: "Opções da criação",
		});
		if (isMobile) {
			// On a phone the options start folded (spec 027).
			await options.getByRole("button", { name: "Opções da criação" }).click();
		}
		await expect(options.getByText("Restam 20 créditos")).toBeVisible();
		await assistant(page)
			.getByRole("textbox", { name: "Assunto" })
			.fill("Sistema solar");
		// About 20 questions on a short topic.
		await expect(
			assistant(page).getByText("Esta criação usa até 3 créditos"),
		).toBeVisible();

		await assistant(page).getByRole("button", { name: "Crie" }).click();

		// The fake provider reports what a short creation uses: 1 credit.
		await expect(
			assistant(page).getByText("Esta criação usou 1 crédito."),
		).toBeVisible();
		await expect(options.getByText("Restam 19 créditos")).toBeVisible();
	});

	test("extracts questions from a PDF", async ({ page }) => {
		await signUp(page);
		await openNewQuiz(page);

		await page.getByRole("button", { name: /PDF para quiz/ }).click();
		await assistant(page)
			.locator('input[type="file"]')
			.setInputFiles({
				name: "lista.pdf",
				mimeType: "application/pdf",
				buffer: await exerciseListPdf(),
			});

		await expect(
			assistant(page).getByText("Limite de páginas: 50"),
		).toBeVisible();
		await assistant(page)
			.getByRole("button", { name: "Selecionar tudo" })
			.click();
		await expect(
			assistant(page).getByRole("checkbox", { name: "Página 1" }),
		).toBeChecked();
		await assistant(page).getByRole("button", { name: "Crie" }).click();

		await expect(
			assistant(page).getByRole("heading", {
				name: "Extrair perguntas e as adicionar ao seu quiz?",
			}),
		).toBeVisible();
		await assistant(page)
			.getByRole("button", { name: "Extrair perguntas" })
			.click();

		await expect(
			assistant(page).getByText("Foram extraídas 3 perguntas."),
		).toBeVisible();
		await expect(assistant(page).getByText("lista.pdf")).toBeVisible();
		await assistant(page)
			.getByRole("button", { name: "Adicionar tudo" })
			.click();

		await expect(assistant(page)).toBeHidden();
		await expect(questionItems(page)).toHaveCount(3);
	});
});
