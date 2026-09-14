import { expect, test } from "@playwright/test";

import { createQuiz, openQuizActions, quizList, signUp } from "./support";

test.beforeEach(async ({ page }) => {
	await signUp(page);
});

test("creates a quiz with a PNG cover that tops Recentes and Rascunhos", async ({
	page,
}) => {
	await createQuiz(page, { title: "Geografia", description: "Capitais" });
	await createQuiz(page, {
		title: "Bom de Bíblia (Junho)",
		description: "Atos 1 a 7",
		withCover: true,
	});

	const first = quizList(page).getByRole("listitem").first();
	await expect(first.getByRole("link")).toHaveText("Bom de Bíblia (Junho)");
	await expect(first.locator("img")).toHaveAttribute("src", /\/media\//);
	await expect(first.getByText("0 perguntas")).toBeVisible();
	await expect(first.getByText("Privado")).toBeVisible();

	await page.getByRole("link", { name: "Rascunhos" }).click();
	await expect(
		quizList(page).getByRole("listitem").first().getByRole("link"),
	).toHaveText("Bom de Bíblia (Junho)");
});

test("searches ignoring accents", async ({ page }) => {
	await createQuiz(page, { title: "Bom de Bíblia (Junho)" });
	await createQuiz(page, { title: "Geografia" });

	await page.getByLabel("Pesquisar quizzes").fill("biblia");

	await expect(
		quizList(page).getByRole("link", { name: "Bom de Bíblia (Junho)" }),
	).toBeVisible();
	await expect(
		quizList(page).getByRole("link", { name: "Geografia" }),
	).toBeHidden();

	await page.getByLabel("Pesquisar quizzes").fill("história");
	await expect(
		page.getByText("Nenhum quiz encontrado para “história”."),
	).toBeVisible();
});

test("duplicates a quiz", async ({ page }) => {
	await createQuiz(page, { title: "Bom de Bíblia (Junho)" });

	await openQuizActions(page, "Bom de Bíblia (Junho)");
	await page.getByRole("menuitem", { name: "Duplicar" }).click();

	await expect(
		quizList(page).getByRole("link", { name: "Bom de Bíblia (Junho) (cópia)" }),
	).toBeVisible();
	await expect(
		quizList(page).getByRole("link", {
			name: "Bom de Bíblia (Junho)",
			exact: true,
		}),
	).toBeVisible();
});

test("deletes to the trash and undoes", async ({ page }) => {
	await createQuiz(page, { title: "Quiz descartável" });

	await openQuizActions(page, "Quiz descartável");
	await page.getByRole("menuitem", { name: "Mover para a lixeira" }).click();
	await expect(page.getByText("Você ainda não tem quizzes.")).toBeVisible();

	await page.getByRole("button", { name: "Desfazer" }).click();
	await expect(
		quizList(page).getByRole("link", { name: "Quiz descartável" }),
	).toBeVisible();
});

test("deletes permanently after confirming, and the cover URL stops responding", async ({
	page,
}) => {
	await createQuiz(page, { title: "Quiz com capa", withCover: true });
	const coverUrl = await quizList(page)
		.getByRole("listitem")
		.first()
		.locator("img")
		.getAttribute("src");
	expect(coverUrl).toBeTruthy();
	expect((await page.request.get(coverUrl ?? "")).ok()).toBe(true);

	await openQuizActions(page, "Quiz com capa");
	await page.getByRole("menuitem", { name: "Mover para a lixeira" }).click();
	await page.getByRole("link", { name: "Lixeira" }).click();
	await expect(
		quizList(page).getByRole("link", { name: "Quiz com capa" }),
	).toBeVisible();

	await openQuizActions(page, "Quiz com capa");
	await page.getByRole("menuitem", { name: "Excluir definitivamente" }).click();
	await page.getByRole("button", { name: "Cancelar" }).click();
	await expect(
		quizList(page).getByRole("link", { name: "Quiz com capa" }),
	).toBeVisible();

	await openQuizActions(page, "Quiz com capa");
	await page.getByRole("menuitem", { name: "Excluir definitivamente" }).click();
	await page
		.getByRole("alertdialog")
		.getByRole("button", { name: "Excluir definitivamente" })
		.click();

	await expect(page.getByText("A lixeira está vazia.")).toBeVisible();
	expect((await page.request.get(coverUrl ?? "")).ok()).toBe(false);
});
