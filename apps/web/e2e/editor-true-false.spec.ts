import { expect, type Page, test } from "@playwright/test";

import {
	chooseProperty,
	createQuizInEditor,
	expectSaved,
	pickNewQuestionType,
	signUp,
} from "./support";

const KEPT_NOTICE =
	"As respostas do Quiz voltam se você retornar para Quiz antes de sair do editor";

const questionText = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const answerMark = (page: Page, position: number) =>
	page.getByRole("checkbox", { name: `Resposta ${position} correta` });
const mark = (page: Page, name: "Verdadeiro" | "Falso") =>
	page.getByRole("checkbox", { name: `${name} correta` });
const answers = (page: Page) =>
	page.getByRole("list", { name: "Respostas" }).getByRole("listitem");
const questionItems = (page: Page) =>
	page.getByRole("list", { name: "Perguntas" }).getByRole("listitem");
/** Exact: the list's alert also contains this sentence among its reasons. */
const correctHint = (page: Page) =>
	page.getByText("Marque a resposta correta", { exact: true });
const typeSelect = (page: Page) =>
	page.getByRole("combobox", { name: "Tipo de pergunta" });

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
	await closePanels(page);
}

async function write(
	page: Page,
	field: ReturnType<typeof answer>,
	text: string,
) {
	await field.fill(text);
	await field.blur();
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

test("adds a true/false question after the selected one, marks its answer and keeps it after a reload", async ({
	page,
}) => {
	await openPanel(page, "Lista de perguntas");
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await expect(page.getByRole("menuitem")).toHaveText([
		"Quiz",
		"Verdadeiro ou falso",
	]);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("menuitem")).toHaveCount(0);
	await expect(questionItems(page)).toHaveCount(1);

	await pickNewQuestionType(page, "Verdadeiro ou falso");
	await expectSaved(page);

	await expect(questionItems(page)).toHaveCount(2);
	await expect(questionItems(page).nth(1)).toContainText(
		"2 Verdadeiro ou falso",
	);
	// Just added: no warnings yet (spec 004, RN-16).
	await expect(
		page.getByRole("button", { name: "Pergunta 2 incompleta" }),
	).toHaveCount(0);
	await closePanels(page);
	await expect(answers(page)).toHaveText(["Verdadeiro", "Falso"]);
	await expect(correctHint(page)).toHaveCount(0);
	// Leaving flags it in the list; coming back points at what is missing.
	await openPanel(page, "Lista de perguntas");
	await page.getByRole("button", { name: /^Pergunta 1:/ }).click();
	await openPanel(page, "Lista de perguntas");
	await expect(
		page.getByRole("button", { name: "Pergunta 2 incompleta" }),
	).toBeVisible();
	await page.getByRole("button", { name: /^Pergunta 2:/ }).click();
	await closePanels(page);
	await expect(correctHint(page)).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Adicionar mais respostas" }),
	).toHaveCount(0);

	await write(page, questionText(page), "A capital do Brasil é Brasília");
	await mark(page, "Verdadeiro").click();
	await expectSaved(page);
	await expect(mark(page, "Verdadeiro")).toBeChecked();
	await expect(correctHint(page)).toHaveCount(0);
	// Unmarking the marked answer marks the other one (RN-07).
	await mark(page, "Verdadeiro").click();
	await expect(mark(page, "Falso")).toBeChecked();
	await expect(mark(page, "Verdadeiro")).not.toBeChecked();
	await expectSaved(page);
	await openPanel(page, "Propriedades");
	await expect(typeSelect(page)).toHaveText("Verdadeiro ou falso");
	await expect(
		page.getByRole("combobox", { name: "Opções de resposta" }),
	).toHaveCount(0);

	await reload(page);
	await openPanel(page, "Lista de perguntas");
	await expect(questionItems(page).nth(1)).toContainText(
		"2 Verdadeiro ou falso",
	);
	await expect(
		page.getByRole("button", { name: "Pergunta 2 incompleta" }),
	).toHaveCount(0);
	await page.getByRole("button", { name: /^Pergunta 2:/ }).click();
	await closePanels(page);
	await expect(mark(page, "Falso")).toBeChecked();
	await expect(mark(page, "Verdadeiro")).not.toBeChecked();
});

test("an unanswered true/false question is still saved and keeps its alert", async ({
	page,
}) => {
	await choose(page, "Tipo de pergunta", "Verdadeiro ou falso");
	await write(page, questionText(page), "O céu é azul");

	await reload(page);

	await expect(questionText(page)).toHaveValue("O céu é azul");
	await expect(answers(page)).toHaveText(["Verdadeiro", "Falso"]);
	await expect(correctHint(page)).toBeVisible();
	await openPanel(page, "Lista de perguntas");
	await expect(
		page.getByRole("button", { name: "Pergunta 1 incompleta" }),
	).toBeVisible();
});

test("changing the type keeps the question, and the answers come back within the session but not after a reload", async ({
	page,
}) => {
	await write(page, questionText(page), "A capital do Brasil é Brasília");
	await write(page, answer(page, 1), "Sim");
	await write(page, answer(page, 2), "Não");
	await answerMark(page, 1).click();
	await expectSaved(page);
	await choose(page, "Limite de tempo", "30 segundos");
	await choose(page, "Pontos", "Pontos em dobro");

	await choose(page, "Tipo de pergunta", "Verdadeiro ou falso");

	await expect(page.getByText(KEPT_NOTICE)).toBeVisible();
	await expect(questionText(page)).toHaveValue(
		"A capital do Brasil é Brasília",
	);
	await expect(answers(page)).toHaveText(["Verdadeiro", "Falso"]);
	await expect(mark(page, "Verdadeiro")).not.toBeChecked();
	await expect(mark(page, "Falso")).not.toBeChecked();
	await openPanel(page, "Propriedades");
	await expect(
		page.getByRole("combobox", { name: "Limite de tempo" }),
	).toHaveText("30 segundos");
	await expect(page.getByRole("combobox", { name: "Pontos" })).toHaveText(
		"Pontos em dobro",
	);
	await closePanels(page);

	// Back to Quiz in the same session: the answers return (RN-17).
	await choose(page, "Tipo de pergunta", "Quiz");
	await expect(answer(page, 1)).toHaveValue("Sim");
	await expect(answer(page, 2)).toHaveValue("Não");
	await expect(answerMark(page, 1)).toBeChecked();

	await reload(page);
	await expect(answer(page, 1)).toHaveValue("Sim");
	await expect(answerMark(page, 1)).toBeChecked();

	// After a reload the editor forgot the quiz answers (RN-18).
	await choose(page, "Tipo de pergunta", "Verdadeiro ou falso");
	await reload(page);
	await expect(answers(page)).toHaveText(["Verdadeiro", "Falso"]);
	await choose(page, "Tipo de pergunta", "Quiz");

	await expect(answer(page, 1)).toHaveValue("");
	await expect(answer(page, 2)).toHaveValue("");
	await expect(questionText(page)).toHaveValue(
		"A capital do Brasil é Brasília",
	);
	await openPanel(page, "Propriedades");
	await expect(
		page.getByRole("combobox", { name: "Limite de tempo" }),
	).toHaveText("30 segundos");
	await expect(
		page.getByRole("combobox", { name: "Opções de resposta" }),
	).toHaveText("Seleção simples");
});
