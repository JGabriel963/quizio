import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	expectSaved,
	pickNewQuestionType,
	quizList,
	signUp,
} from "./support";

const questionText = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const titleField = (page: Page) =>
	page.getByRole("textbox", { name: "Título do quiz" });
const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const saveButton = (page: Page) =>
	page.getByRole("button", { name: "Salvar", exact: true });
const exitButton = (page: Page) =>
	page.getByRole("button", { name: "Sair", exact: true });
/** The status badge of the editor header; on narrow screens it is only announced. */
const headerStatus = (page: Page, label: string) =>
	page.getByRole("banner").getByText(label, { exact: true });
const libraryItem = (page: Page, title: string) =>
	quizList(page).getByRole("listitem").filter({ hasText: title });
const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const incompleteDialog = (page: Page) =>
	page.getByRole("dialog", { name: "Não é possível jogar este quiz" });
const unsavedDialog = (page: Page) =>
	page.getByRole("dialog", { name: "Algumas alterações não foram salvas" });

async function writeTitle(page: Page, title: string) {
	await titleField(page).fill(title);
	await titleField(page).blur();
	await expectSaved(page);
}

async function writeQuestion(page: Page, text: string) {
	await questionText(page).fill(text);
	await questionText(page).blur();
	await expectSaved(page);
}

/** Fills the selected quiz question with everything Salvar asks for. */
async function completeQuestion(page: Page, text: string) {
	await writeQuestion(page, text);
	await answer(page, 1).fill("Brasília");
	await answer(page, 2).fill("Rio de Janeiro");
	await answer(page, 2).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
}

async function publish(page: Page) {
	await saveButton(page).click();
	await expect(readyDialog(page)).toBeVisible();
}

async function openEditorFromLibrary(page: Page, title: string) {
	await libraryItem(page, title).getByRole("link", { name: title }).click();
	await page.getByRole("link", { name: "Editar", exact: true }).click();
	await expect(questionText(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await signUp(page);
	await createQuizInEditor(page);
});

test("publica um quiz completo e volta à biblioteca, fora dos rascunhos", async ({
	page,
}) => {
	await writeTitle(page, "Capitais");
	await completeQuestion(page, "Qual é a capital do Brasil?");
	await expect(headerStatus(page, "Rascunho")).toBeAttached();

	await saveButton(page).click();

	const dialog = readyDialog(page);
	await expect(dialog).toBeVisible();
	const options = dialog.getByRole("list", { name: "Próximos passos" });
	await expect(options.getByRole("listitem")).toHaveCount(4);
	// "Organizar ao vivo" works since the live game (spec 008, RN-03).
	await expect(options.getByText("Em breve")).toHaveCount(3);
	await expect(
		options.getByRole("button", { name: /Organizar ao vivo/ }),
	).toBeVisible();
	await expect(dialog.getByRole("button")).toHaveCount(3);

	await dialog.getByRole("button", { name: "Pronto" }).click();

	await expect(page).toHaveURL(/\/library/);
	const item = libraryItem(page, "Capitais");
	await expect(item).toBeVisible();
	await expect(item.getByText("Rascunho")).toHaveCount(0);
	await expect(item.getByText("Alterações não salvas")).toHaveCount(0);

	await page.goto("/library?section=drafts");
	await expect(page.getByRole("heading", { name: "Capitais" })).toHaveCount(0);
	await expect(quizList(page).getByText("Capitais")).toHaveCount(0);

	await page.goto("/library");
	await libraryItem(page, "Capitais")
		.getByRole("link", { name: "Capitais" })
		.click();
	await expect(page.getByText(/^Versão jogável salva/)).toBeVisible();
});

test("lista as perguntas incompletas, Corrigir leva à pergunta e Deixar sem salvar sai sem publicar", async ({
	page,
}) => {
	await writeTitle(page, "Incompleto");

	await saveButton(page).click();

	const dialog = incompleteDialog(page);
	await expect(dialog).toBeVisible();
	const card = dialog.getByRole("listitem", { name: "Pergunta 1" });
	await expect(card).toContainText("1 - Quiz");
	await expect(card).toContainText("Pergunta ausente");
	await expect(card).toContainText("2 respostas faltando");
	await expect(card).toContainText("Resposta correta não selecionada");

	await dialog.getByRole("button", { name: "Corrigir pergunta 1" }).click();

	await expect(dialog).toBeHidden();
	// The question that had just been started is now pointed out (RN-11).
	await expect(
		page.getByText("Nenhuma pergunta foi adicionada."),
	).toBeVisible();

	await saveButton(page).click();
	await incompleteDialog(page)
		.getByRole("button", { name: "Deixar sem salvar" })
		.click();

	await expect(page).toHaveURL(/\/library/);
	await expect(
		libraryItem(page, "Incompleto").getByText("Rascunho"),
	).toBeVisible();
});

test("sem título, pede os toques finais antes de publicar", async ({
	page,
}) => {
	await completeQuestion(page, "Qual é a capital do Brasil?");

	await saveButton(page).click();

	const dialog = page.getByRole("dialog", { name: "Toques finais" });
	await expect(dialog).toBeVisible();
	const next = dialog.getByRole("button", { name: "Continuar" });
	await expect(next).toBeDisabled();
	await dialog.getByRole("textbox", { name: "Título" }).fill("TESTE");
	await expect(
		dialog.getByRole("status", { name: "Caracteres restantes no título" }),
	).toHaveText("90");
	await dialog
		.getByRole("textbox", { name: "Título" })
		.fill("Capitais do mundo");
	await dialog
		.getByRole("textbox", { name: "Descrição (Opcional)" })
		.fill("Para a aula de geografia");
	await next.click();

	await expect(readyDialog(page)).toBeVisible();
	await readyDialog(page).getByRole("button", { name: "Pronto" }).click();

	await expect(page).toHaveURL(/\/library/);
	await libraryItem(page, "Capitais do mundo")
		.getByRole("link", { name: "Capitais do mundo" })
		.click();
	await expect(page.getByText("Para a aula de geografia")).toBeVisible();
});

test("editar depois de publicar guarda as alterações até o próximo Salvar, e Descartar volta à versão jogável", async ({
	page,
}) => {
	await writeTitle(page, "Geografia");
	await completeQuestion(page, "Qual é a capital do Brasil?");
	await publish(page);
	await readyDialog(page)
		.getByRole("button", { name: "Voltar para edição" })
		.click();
	await expect(readyDialog(page)).toBeHidden();
	await expect(headerStatus(page, "Publicado")).toBeAttached();

	// Sair without changes does not ask.
	await writeQuestion(page, "Qual é a capital da Argentina?");
	await expect(headerStatus(page, "Alterações não salvas")).toBeAttached();
	// Undoing by hand clears the changes (RN-19).
	await writeQuestion(page, "Qual é a capital do Brasil?");
	await expect(headerStatus(page, "Publicado")).toBeAttached();

	await writeQuestion(page, "Qual é a capital da Argentina?");
	await exitButton(page).click();
	const dialog = unsavedDialog(page);
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText(
		"Se você descartar as alterações, elas serão perdidas.",
	);
	await dialog.getByRole("button", { name: "Voltar para edição" }).click();
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/creator\//);

	await exitButton(page).click();
	await unsavedDialog(page)
		.getByRole("button", { name: "Deixar sem salvar" })
		.click();

	await expect(page).toHaveURL(/\/library/);
	await expect(
		libraryItem(page, "Geografia").getByText("Alterações não salvas"),
	).toBeVisible();
	await page.goto("/library?section=drafts");
	await expect(quizList(page).getByText("Geografia")).toHaveCount(0);

	// The changes were kept: the editor opens with them.
	await page.goto("/library");
	await openEditorFromLibrary(page, "Geografia");
	await expect(questionText(page)).toHaveValue(
		"Qual é a capital da Argentina?",
	);

	await exitButton(page).click();
	await unsavedDialog(page).getByRole("button", { name: "Descartar" }).click();

	await expect(page).toHaveURL(/\/library/);
	await expect(libraryItem(page, "Geografia")).toBeVisible();
	await expect(
		libraryItem(page, "Geografia").getByText("Alterações não salvas"),
	).toHaveCount(0);
	await openEditorFromLibrary(page, "Geografia");
	await expect(questionText(page)).toHaveValue("Qual é a capital do Brasil?");
	await expect(headerStatus(page, "Publicado")).toBeAttached();
});

test("publicar de novo leva as alterações para a versão jogável", async ({
	page,
}) => {
	await writeTitle(page, "Segunda versão");
	await completeQuestion(page, "Qual é a capital do Brasil?");
	await publish(page);
	await readyDialog(page)
		.getByRole("button", { name: "Voltar para edição" })
		.click();
	await expect(readyDialog(page)).toBeHidden();

	// A new blank question blocks the next Salvar, and the version stays.
	const listToggle = page.getByRole("button", { name: "Lista de perguntas" });
	if (await listToggle.isVisible()) {
		await listToggle.click();
	}
	await pickNewQuestionType(page, "Verdadeiro ou falso");
	await expect(questionText(page)).toHaveValue("");
	await saveButton(page).click();
	await expect(
		incompleteDialog(page).getByRole("listitem", { name: "Pergunta 2" }),
	).toContainText("2 - Verdadeiro ou falso");
	await incompleteDialog(page)
		.getByRole("button", { name: "Corrigir pergunta 2" })
		.click();
	await expect(incompleteDialog(page)).toBeHidden();

	await writeQuestion(page, "Brasília é a capital do Brasil");
	await page.getByRole("checkbox", { name: "Verdadeiro correta" }).click();
	await expectSaved(page);
	await publish(page);
	await readyDialog(page).getByRole("button", { name: "Pronto" }).click();

	await expect(page).toHaveURL(/\/library/);
	const item = libraryItem(page, "Segunda versão");
	await expect(item).toContainText("2 perguntas");
	await expect(item.getByText("Alterações não salvas")).toHaveCount(0);
});

test("um quiz publicado não fica sem título", async ({ page }) => {
	await writeTitle(page, "Com título");
	await completeQuestion(page, "Qual é a capital do Brasil?");
	await publish(page);
	await readyDialog(page)
		.getByRole("button", { name: "Voltar para edição" })
		.click();
	await expect(readyDialog(page)).toBeHidden();

	await titleField(page).fill("");
	await titleField(page).blur();

	await expect(
		page.getByText("Um quiz publicado precisa de título"),
	).toBeVisible();
	await expect(titleField(page)).toHaveValue("Com título");
});
