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

/** After a reload the editor may still be loading. */
async function waitForEditor(page: Page) {
	await expect(questionText(page)).toBeVisible();
}

const questionCard = (page: Page, position: number) =>
	page.getByRole("button", { name: new RegExp(`^Pergunta ${position}:`) });

/**
 * Wide screens have Duplicar and Excluir beside each question; on phones the
 * list is a strip, and they sit in the ⋮ beside the selected question's text.
 */
async function questionAction(
	page: Page,
	isMobile: boolean,
	position: number,
	action: "Duplicar" | "Excluir",
) {
	if (!isMobile) {
		await page
			.getByRole("button", { name: `${action} pergunta ${position}` })
			.click();
		return;
	}
	await questionCard(page, position).click();
	await expect(questionCard(page, position)).toHaveAttribute(
		"aria-current",
		"true",
	);
	await page.getByRole("button", { name: "Propriedades da pergunta" }).click();
	await page.getByRole("menuitem", { name: action }).click();
}

/** Drags from the middle of one element to the given point, holding first as a finger would. */
async function drag(
	page: Page,
	from: { x: number; y: number; width: number; height: number },
	to: { x: number; y: number },
	holdMs = 0,
) {
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	if (holdMs > 0) {
		await page.waitForTimeout(holdMs);
	}
	await page.mouse.move(to.x, to.y, { steps: 20 });
	await page.mouse.up();
}

async function writeQuestion(page: Page, text: string) {
	await questionText(page).fill(text);
	await questionText(page).blur();
	await expectSaved(page);
}

async function addQuestion(page: Page, text: string) {
	await waitForEditor(page);
	const count = await questionItems(page).count();
	await pickNewQuestionType(page);
	await expect(questionItems(page)).toHaveCount(count + 1);
	await expect(questionText(page)).toHaveValue("");
	await writeQuestion(page, text);
}

async function expectOrder(page: Page, texts: string[]) {
	await waitForEditor(page);
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
	await waitForEditor(page);
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

test("adds after the selected, duplicates, moves C before A, and the order survives a reload", async ({
	page,
	isMobile,
}) => {
	await quizWithQuestionsABC(page);

	// Adicionar goes right after the selected question (RN-11).
	await page.getByRole("button", { name: "Pergunta 1: Pergunta A" }).click();
	await addQuestion(page, "Nova");
	await expectOrder(page, ["Pergunta A", "Nova", "Pergunta B", "Pergunta C"]);

	// The copy goes right after the original, with its text (RN-12).
	await questionAction(page, isMobile, 3, "Duplicar");
	await expect(questionText(page)).toHaveValue("Pergunta B");
	await expectOrder(page, [
		"Pergunta A",
		"Nova",
		"Pergunta B",
		"Pergunta B",
		"Pergunta C",
	]);

	// Drag the last question to the top (RN-13): by the handle, or on phones by
	// the card itself, one place at a time along the strip.
	if (isMobile) {
		// The strip may scroll during a drag and carry the card further, so
		// follow where C is instead of counting on one place per drag.
		for (let drags = 0; drags < 4; drags++) {
			const position = await positionOf(page, "Pergunta C");
			if (position === 1) {
				break;
			}
			await dragCardOnePlaceLeft(page, position);
			await expectSaved(page);
		}
	} else {
		await dragLastToTop(page);
		await expectSaved(page);
	}

	await page.reload();
	await expectOrder(page, [
		"Pergunta C",
		"Pergunta A",
		"Nova",
		"Pergunta B",
		"Pergunta B",
	]);
});

async function dragLastToTop(page: Page) {
	const handle = page.getByRole("button", { name: "Mover pergunta 5" });
	const target = page.getByRole("button", { name: "Mover pergunta 1" });
	const from = await handle.boundingBox();
	const to = await target.boundingBox();
	if (!from || !to) {
		throw new Error("Drag handles are not visible");
	}
	await drag(page, from, { x: to.x + to.width / 2, y: to.y - 20 });
}

/** Where the question with this text is in the list, from 1. */
async function positionOf(page: Page, text: string) {
	const names = await page
		.getByRole("list", { name: "Perguntas" })
		.getByRole("button", { name: /^Pergunta \d+:/ })
		.evaluateAll((cards) =>
			cards.map((card) => card.getAttribute("aria-label")),
		);
	return names.findIndex((name) => name?.endsWith(`: ${text}`)) + 1;
}

async function dragCardOnePlaceLeft(page: Page, position: number) {
	await questionCard(page, position).scrollIntoViewIfNeeded();
	const from = await questionCard(page, position).boundingBox();
	const to = await questionCard(page, position - 1).boundingBox();
	if (!from || !to) {
		throw new Error("Question cards are not visible");
	}
	// Touch screens drag only after holding the card (the strip scrolls otherwise).
	await drag(
		page,
		from,
		{ x: to.x + to.width / 3, y: to.y + to.height / 2 },
		400,
	);
}

test("moves a question with the keyboard", async ({ page, isMobile }) => {
	test.skip(isMobile, "Phones have no handles: the cards are dragged instead.");
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
	isMobile,
}) => {
	await quizWithQuestionsABC(page);

	// Deleting asks first; cancelling keeps the question (RN-14).
	await questionAction(page, isMobile, 2, "Excluir");
	const confirmation = page.getByRole("alertdialog", {
		name: "Excluir pergunta",
	});
	await expect(confirmation).toContainText(
		"Tem certeza de que quer excluir a pergunta 2? Essa ação não pode ser desfeita.",
	);
	await confirmation.getByRole("button", { name: "Cancelar" }).click();
	await expect(confirmation).toBeHidden();
	await expectOrder(page, ["Pergunta A", "Pergunta B", "Pergunta C"]);

	await questionAction(page, isMobile, 2, "Excluir");
	await confirmation.getByRole("button", { name: "Excluir" }).click();
	await expectOrder(page, ["Pergunta A", "Pergunta C"]);
	await expect(questionText(page)).toHaveValue("Pergunta C");
	// No undo after the confirmation (RN-14).
	await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
	await expectSaved(page);
	await page.reload();
	await expectOrder(page, ["Pergunta A", "Pergunta C"]);
});

test("the only question cannot be deleted", async ({ page, isMobile }) => {
	await createQuizInEditor(page);
	await waitForEditor(page);

	if (isMobile) {
		await page
			.getByRole("button", { name: "Propriedades da pergunta" })
			.click();
		await expect(
			page.getByRole("menuitem", { name: "Excluir" }),
		).toHaveAttribute("aria-disabled", "true");
		return;
	}
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
