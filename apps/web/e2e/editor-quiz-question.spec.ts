import { expect, type Page, test } from "@playwright/test";

import {
	chooseProperty,
	createQuizInEditor,
	expectSaved,
	pickNewQuestionType,
	signUp,
} from "./support";

const questionText = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const correctMark = (page: Page, position: number) =>
	page.getByRole("checkbox", { name: `Resposta ${position} correta` });
const answerFields = (page: Page) =>
	page.getByRole("list", { name: "Respostas" }).getByRole("textbox");
const questionItems = (page: Page) =>
	page.getByRole("list", { name: "Perguntas" }).getByRole("listitem");

/** On narrow screens the side panels sit behind buttons, one open at a time. */
async function openPanel(
	page: Page,
	name: "Lista de perguntas" | "Propriedades",
) {
	await expect(questionText(page)).toBeVisible();
	const toggle = page.getByRole("button", { name, exact: true });
	if (
		(await toggle.isVisible()) &&
		(await toggle.getAttribute("aria-expanded")) === "false"
	) {
		await toggle.click();
	}
}

async function closePanels(page: Page) {
	for (const name of ["Lista de perguntas", "Propriedades"]) {
		const toggle = page.getByRole("button", { name, exact: true });
		if (
			(await toggle.isVisible()) &&
			(await toggle.getAttribute("aria-expanded")) === "true"
		) {
			await toggle.click();
		}
	}
}

async function choose(page: Page, label: string, option: string) {
	await openPanel(page, "Propriedades");
	await chooseProperty(page, label, option);
	await expectSaved(page);
}

async function writeAnswer(page: Page, position: number, text: string) {
	await answer(page, position).fill(text);
	await answer(page, position).blur();
	await expectSaved(page);
}

async function reload(page: Page) {
	await page.reload();
	await expect(questionText(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await signUp(page);
	await createQuizInEditor(page);
});

test("answers and corrects are saved, a second correct turns on multiple choice and the incomplete alert goes away", async ({
	page,
}) => {
	// A question just started is not warned about (spec 004, RN-16)...
	await expect(page.getByText(/não foi adicionada/)).toHaveCount(0);
	await openPanel(page, "Lista de perguntas");
	await expect(
		page.getByRole("button", { name: "Pergunta 1 incompleta" }),
	).toHaveCount(0);
	// ...leaving it flags it in the list...
	await pickNewQuestionType(page);
	await expectSaved(page);
	await expect(
		page.getByRole("button", { name: "Pergunta 1 incompleta" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Pergunta 2 incompleta" }),
	).toHaveCount(0);
	// ...and coming back shows what is missing, beside each field.
	await page.getByRole("button", { name: /^Pergunta 1:/ }).click();
	await closePanels(page);
	await expect(
		page.getByText("Nenhuma pergunta foi adicionada."),
	).toBeVisible();
	await expect(page.getByText("A resposta 1 não foi adicionada")).toBeVisible();
	await expect(page.getByText("A resposta 2 não foi adicionada")).toBeVisible();

	await questionText(page).fill("Qual é a capital do Brasil?");
	await expect(page.getByText("Nenhuma pergunta foi adicionada.")).toHaveCount(
		0,
	);
	await writeAnswer(page, 1, "Brasília");
	await writeAnswer(page, 2, "Rio");
	await expect(page.getByText(/não foi adicionada/)).toHaveCount(0);
	await correctMark(page, 1).click();
	await expectSaved(page);
	await correctMark(page, 2).click();

	await expect(page.getByText("Múltipla escolha ativada")).toBeVisible();
	await expectSaved(page);
	await openPanel(page, "Propriedades");
	await expect(
		page.getByRole("combobox", { name: "Opções de resposta" }),
	).toHaveText("Múltipla escolha");
	await openPanel(page, "Lista de perguntas");
	await expect(
		page.getByRole("button", { name: "Pergunta 1 incompleta" }),
	).toHaveCount(0);

	await reload(page);
	await expect(answer(page, 1)).toHaveValue("Brasília");
	await expect(answer(page, 2)).toHaveValue("Rio");
	await expect(correctMark(page, 1)).toBeChecked();
	await expect(correctMark(page, 2)).toBeChecked();
});

test("an incomplete question is still saved and keeps its alert", async ({
	page,
}) => {
	await writeAnswer(page, 1, "Brasília");

	await reload(page);

	await expect(answer(page, 1)).toHaveValue("Brasília");
	await openPanel(page, "Lista de perguntas");
	await expect(
		page.getByRole("button", { name: "Pergunta 1 incompleta" }),
	).toBeVisible();
});

test("extra answers come with colors 5 and 6, and removing them discards their text", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Adicionar mais respostas" }).click();
	await expect(answerFields(page)).toHaveCount(6);
	await expect(answer(page, 6)).toHaveAttribute(
		"placeholder",
		"Adicionar resposta 6 (opcional)",
	);
	await writeAnswer(page, 5, "Salvador");

	await page.getByRole("button", { name: "Remover respostas extras" }).click();
	await expect(answerFields(page)).toHaveCount(4);
	await expectSaved(page);

	await reload(page);
	await expect(answerFields(page)).toHaveCount(4);
	await page.getByRole("button", { name: "Adicionar mais respostas" }).click();
	await expect(answer(page, 5)).toHaveValue("");
});

test("time limit shows in the list, applies to every question, and points persist", async ({
	page,
}) => {
	await openPanel(page, "Propriedades");
	await expect(
		page.getByRole("combobox", { name: "Limite de tempo" }),
	).toHaveText("20 segundos");
	await choose(page, "Limite de tempo", "1 minuto 30 segundos");
	await choose(page, "Pontos", "Pontos em dobro");
	await openPanel(page, "Lista de perguntas");
	await expect(questionItems(page).first()).toContainText("90");

	for (const _ of [1, 2]) {
		await openPanel(page, "Lista de perguntas");
		await pickNewQuestionType(page);
		await expectSaved(page);
	}
	await openPanel(page, "Lista de perguntas");
	await expect(questionItems(page)).toHaveCount(3);
	await questionItems(page)
		.first()
		.getByRole("button", { name: /^Pergunta 1:/ })
		.click();
	await choose(page, "Limite de tempo", "45 segundos");
	await page
		.getByRole("button", { name: "Aplicar a todas as perguntas" })
		.click();

	await expect(page.getByText("Tempo aplicado a 3 perguntas")).toBeVisible();
	await expectSaved(page);
	await reload(page);
	await openPanel(page, "Lista de perguntas");
	for (const index of [0, 1, 2]) {
		await expect(questionItems(page).nth(index)).toContainText("45");
	}
	await openPanel(page, "Propriedades");
	await expect(page.getByRole("combobox", { name: "Pontos" })).toHaveText(
		"Pontos em dobro",
	);
});
