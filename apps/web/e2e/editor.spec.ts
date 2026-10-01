import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	expectSaved,
	pickNewQuestionType,
	quizList,
	signIn,
	signUp,
} from "./support";

const questionText = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const titleField = (page: Page) =>
	page.getByRole("textbox", { name: "Título do quiz" });
const questionItems = (page: Page) =>
	page.getByRole("list", { name: "Perguntas" }).getByRole("listitem");

/** On narrow screens the question list sits behind a button. */
async function openQuestionList(page: Page) {
	// After a reload the editor may still be loading.
	await expect(questionText(page)).toBeVisible();
	const toggle = page.getByRole("button", { name: "Lista de perguntas" });
	if (
		(await toggle.isVisible()) &&
		(await toggle.getAttribute("aria-expanded")) === "false"
	) {
		await toggle.click();
	}
}

async function writeQuestion(page: Page, text: string) {
	await questionText(page).fill(text);
	await questionText(page).blur();
	await expectSaved(page);
}

async function addQuestion(page: Page, text: string) {
	await openQuestionList(page);
	const count = await questionItems(page).count();
	await pickNewQuestionType(page);
	await expect(questionItems(page)).toHaveCount(count + 1);
	await expect(questionText(page)).toHaveValue("");
	await writeQuestion(page, text);
}

async function expectOrder(page: Page, texts: string[]) {
	await openQuestionList(page);
	await expect(questionItems(page)).toHaveCount(texts.length);
	for (const [index, text] of texts.entries()) {
		await expect(questionItems(page).nth(index)).toContainText(
			`${index + 1} Quiz`,
		);
		await expect(questionItems(page).nth(index)).toContainText(text);
	}
}

/** A quiz with the questions A, B and C, in that order. */
async function quizWithQuestionsABC(page: Page) {
	await createQuizInEditor(page);
	await writeQuestion(page, "Pergunta A");
	await addQuestion(page, "Pergunta B");
	await addQuestion(page, "Pergunta C");
	await expectOrder(page, ["Pergunta A", "Pergunta B", "Pergunta C"]);
}

test.beforeEach(async ({ page }) => {
	await signUp(page);
});

test("Criar opens the editor with one blank Quiz question, listed in Rascunhos as 1 pergunta", async ({
	page,
}) => {
	await createQuizInEditor(page);

	await expect(questionText(page)).toHaveValue("");
	await expect(questionText(page)).toHaveAttribute(
		"placeholder",
		"Comece a digitar a pergunta",
	);
	await openQuestionList(page);
	await expect(questionItems(page)).toHaveCount(1);
	await expect(questionItems(page).first()).toContainText("1 Quiz");
	await expect(
		page.getByRole("navigation", { name: "Navegação principal" }),
	).toHaveCount(0);

	await page.goto("/library?section=drafts");
	const first = quizList(page).getByRole("listitem").first();
	await expect(first.getByRole("link")).toHaveText("Quiz sem título");
	await expect(first.getByText("1 pergunta")).toBeVisible();
});

test("typed text and title survive a reload", async ({ page }) => {
	await createQuizInEditor(page);

	await titleField(page).fill("Geografia");
	await writeQuestion(page, "Qual é a capital do Brasil?");
	await page.reload();

	await expect(titleField(page)).toHaveValue("Geografia");
	await expect(questionText(page)).toHaveValue("Qual é a capital do Brasil?");
	await expectOrder(page, ["Qual é a capital do Brasil?"]);
});

test("adds after the selected, duplicates, drags C before A, and the order survives a reload", async ({
	page,
}) => {
	await quizWithQuestionsABC(page);

	// Adicionar goes right after the selected question (RN-11).
	await page.getByRole("button", { name: "Pergunta 1: Pergunta A" }).click();
	await addQuestion(page, "Nova");
	await expectOrder(page, ["Pergunta A", "Nova", "Pergunta B", "Pergunta C"]);

	// The copy goes right after the original, with its text (RN-12).
	await page.getByRole("button", { name: "Duplicar pergunta 3" }).click();
	await expect(questionText(page)).toHaveValue("Pergunta B");
	await expectOrder(page, [
		"Pergunta A",
		"Nova",
		"Pergunta B",
		"Pergunta B",
		"Pergunta C",
	]);

	// Drag the last question to the top (RN-13).
	const handle = page.getByRole("button", { name: "Mover pergunta 5" });
	const target = page.getByRole("button", { name: "Mover pergunta 1" });
	const from = await handle.boundingBox();
	const to = await target.boundingBox();
	if (!from || !to) {
		throw new Error("Drag handles are not visible");
	}
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(to.x + to.width / 2, to.y - 20, { steps: 20 });
	await page.mouse.up();
	await expectSaved(page);

	await page.reload();
	await expectOrder(page, [
		"Pergunta C",
		"Pergunta A",
		"Nova",
		"Pergunta B",
		"Pergunta B",
	]);
});

test("moves a question with the keyboard", async ({ page }) => {
	await quizWithQuestionsABC(page);

	const handle = page.getByRole("button", { name: "Mover pergunta 2" });
	await handle.focus();
	// Each step waits for the drag library's own accessibility feedback.
	await page.keyboard.press("Space");
	await expect(handle).toHaveAttribute("aria-pressed", "true");
	await page.keyboard.press("ArrowUp");
	await expect(page.getByText("Pergunta 2 sobre a posição 1.")).toBeAttached();
	await page.keyboard.press("Space");
	await expect(
		page.getByText("Pergunta 2 movida para a posição 1."),
	).toBeAttached();
	await expectSaved(page);

	await expectOrder(page, ["Pergunta B", "Pergunta A", "Pergunta C"]);
	await page.reload();
	await expectOrder(page, ["Pergunta B", "Pergunta A", "Pergunta C"]);
});

test("deletes after confirming, and cancelling keeps the question", async ({
	page,
}) => {
	await quizWithQuestionsABC(page);

	// Deleting asks first; cancelling keeps the question (RN-14).
	await page.getByRole("button", { name: "Excluir pergunta 2" }).click();
	const confirmation = page.getByRole("alertdialog", {
		name: "Excluir pergunta",
	});
	await expect(confirmation).toContainText(
		"Tem certeza de que quer excluir a pergunta 2? Essa ação não pode ser desfeita.",
	);
	await confirmation.getByRole("button", { name: "Cancelar" }).click();
	await expect(confirmation).toBeHidden();
	await expectOrder(page, ["Pergunta A", "Pergunta B", "Pergunta C"]);

	await page.getByRole("button", { name: "Excluir pergunta 2" }).click();
	await confirmation.getByRole("button", { name: "Excluir" }).click();
	await expectOrder(page, ["Pergunta A", "Pergunta C"]);
	await expect(questionText(page)).toHaveValue("Pergunta C");
	// No undo after the confirmation (RN-14).
	await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
	await expectSaved(page);
	await page.reload();
	await expectOrder(page, ["Pergunta A", "Pergunta C"]);
});

test("the only question cannot be deleted", async ({ page }) => {
	await createQuizInEditor(page);
	await openQuestionList(page);

	const remove = page.getByRole("button", { name: "Excluir pergunta 1" });
	await expect(remove).toHaveAttribute("aria-disabled", "true");
	await expect(remove).toHaveAccessibleDescription(
		"Não é possível excluir todo o conteúdo",
	);
});

test("shows the failure offline and saves on retry", async ({ page }) => {
	await createQuizInEditor(page);

	await page.context().setOffline(true);
	await questionText(page).fill("Pergunta nova");
	await questionText(page).blur();
	await expect(
		page.getByRole("status").filter({ hasText: "Não foi possível salvar" }),
	).toBeVisible();
	await expect(questionText(page)).toHaveValue("Pergunta nova");

	await page.context().setOffline(false);
	await page.getByRole("button", { name: "Tentar de novo" }).click();
	await expectSaved(page);
	await page.reload();
	await expect(questionText(page)).toHaveValue("Pergunta nova");
});

test("Sair returns to the library with the new title and count", async ({
	page,
}) => {
	await createQuizInEditor(page);
	await titleField(page).fill("Capitais");
	await addQuestion(page, "Segunda");

	// A draft leaves at once, to the library (spec 006, RN-23).
	await page.getByRole("button", { name: "Sair", exact: true }).click();

	await expect(page).toHaveURL(/\/library/);
	const item = quizList(page).getByRole("listitem").filter({
		hasText: "Capitais",
	});
	await expect(item).toContainText("2 perguntas");
	await expect(item.getByText("Rascunho")).toBeVisible();
	await item.getByRole("link", { name: "Capitais" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Capitais" }),
	).toBeVisible();
	await expect(
		page.getByText("Ainda não foi salvo como jogável"),
	).toBeVisible();
	await page.getByRole("link", { name: "Editar", exact: true }).click();
	await expect(titleField(page)).toHaveValue("Capitais");
});

test("a visitor opening the editor signs in and comes back", async ({
	page,
}) => {
	await page.context().clearCookies();
	const { email } = await signUp(page);
	await createQuizInEditor(page);
	const editorUrl = page.url();

	await page.context().clearCookies();
	await page.goto(editorUrl);
	await expect(page).toHaveURL(/\/login\?redirect=/);
	await signIn(page, email);

	await expect(page).toHaveURL(editorUrl);
	await expect(questionText(page)).toBeVisible();
});
