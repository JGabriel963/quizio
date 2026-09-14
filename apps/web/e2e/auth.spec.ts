import { expect, test } from "@playwright/test";

import { createQuiz, signIn, signUp, uniqueEmail } from "./support";

test("signs up and lands on the empty library", async ({ page }) => {
	await signUp(page);

	await expect(page.getByRole("heading", { name: "Recentes" })).toBeVisible();
	await expect(page.getByText("Você ainda não tem quizzes.")).toBeVisible();
});

test("signs in and out, and the library then requires login", async ({
	page,
}) => {
	const { name, email } = await signUp(page, { email: uniqueEmail() });

	await page.getByRole("button", { name }).click();
	await page.getByRole("menuitem", { name: "Sair" }).click();
	await expect(page).toHaveURL(/\/$/);

	await page.goto("/library");
	await expect(page).toHaveURL(/\/login\?redirect=/);

	await signIn(page, email);
	await expect(page).toHaveURL(/\/library/);
	await expect(page.getByRole("heading", { name: "Recentes" })).toBeVisible();
});

test("keeps the session in a new browser context with the saved storage state", async ({
	page,
	browser,
	baseURL,
}) => {
	await signUp(page);
	const storageState = await page.context().storageState();

	const reopened = await browser.newContext({ storageState, baseURL });
	const reopenedPage = await reopened.newPage();
	await reopenedPage.goto("/library");

	await expect(
		reopenedPage.getByRole("heading", { name: "Recentes" }),
	).toBeVisible();
	await reopened.close();
});

test("returns to the requested quiz page after login", async ({ page }) => {
	const { email } = await signUp(page);
	await createQuiz(page, { title: "Quiz do redirecionamento" });
	await page.getByRole("link", { name: "Quiz do redirecionamento" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Quiz do redirecionamento" }),
	).toBeVisible();
	const quizUrl = page.url();

	await page.context().clearCookies();
	await page.goto(quizUrl);
	await expect(page).toHaveURL(/\/login\?redirect=/);
	await signIn(page, email);

	await expect(page).toHaveURL(quizUrl);
	await expect(
		page.getByRole("heading", { level: 1, name: "Quiz do redirecionamento" }),
	).toBeVisible();
});
