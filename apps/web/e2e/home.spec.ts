import { expect, test } from "@playwright/test";

import {
	createQuiz,
	createQuizInEditor,
	expectSaved,
	quizList,
	signUp,
} from "./support";

test("a visitor sees the public landing with sign-in actions and no main nav", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "Quizio" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
	await expect(
		page.getByRole("navigation", { name: "Navegação principal" }),
	).toBeHidden();
	await expect(
		page.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" }),
	).toBeHidden();
});

test("a signed-in creator lands on the dashboard and opens a quiz from it", async ({
	page,
}) => {
	const { name } = await signUp(page);

	await expect(
		page.getByRole("heading", { name: `Olá, ${name}!` }),
	).toBeVisible();
	await expect(page.getByText("Você ainda não tem quizzes.")).toBeVisible();
	const reports = page.getByRole("region", {
		name: /Relatórios mais recentes/,
	});
	await expect(reports).toBeVisible();
	await expect(reports.getByText("Em breve")).toBeVisible();

	await createQuiz(page, { title: "Bom de Bíblia (Junho)" });
	await page.goto("/");

	const list = page.getByRole("list", { name: "Seus quizzes" });
	await expect(list.getByRole("listitem")).toHaveCount(1);
	await list.getByRole("link", { name: "Bom de Bíblia (Junho)" }).click();
	await expect(
		page.getByRole("heading", { level: 1, name: "Bom de Bíblia (Junho)" }),
	).toBeVisible();
});

test("creating from the top bar opens the editor and puts the quiz on top of the dashboard", async ({
	page,
}) => {
	await signUp(page);

	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill("Geografia");
	await expectSaved(page);

	await page.goto("/");
	await expect(
		page
			.getByRole("list", { name: "Seus quizzes" })
			.getByRole("listitem")
			.first(),
	).toContainText("Geografia");
});

test.describe("tela larga", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("areas that are not built yet are visible but not reachable", async ({
		page,
	}) => {
		await signUp(page);

		const nav = page.getByRole("navigation", { name: "Navegação principal" });
		for (const area of ["Relatórios", "Descobrir", "Grupos"]) {
			await expect(nav.getByText(area)).toBeVisible();
			await expect(nav.getByRole("link", { name: area })).toHaveCount(0);
		}
		await expect(page).toHaveURL(/\/$/);
	});
});

test("searching from the dashboard filters the library", async ({ page }) => {
	await signUp(page);
	await createQuiz(page, { title: "Bom de Bíblia (Junho)" });
	await createQuiz(page, { title: "Geografia" });
	await page.goto("/");
	// The list only fills in after hydration; typing before it would submit the
	// form natively.
	await expect(
		page.getByRole("list", { name: "Seus quizzes" }).getByRole("listitem"),
	).toHaveCount(2);

	await page
		.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" })
		.fill("biblia");
	await page
		.getByRole("searchbox", { name: "Pesquisar nos meus quizzes" })
		.press("Enter");

	await expect(page).toHaveURL(/\/library\?.*q=biblia/);
	await expect(quizList(page).getByRole("listitem")).toHaveCount(1);
	await expect(quizList(page).getByRole("link").first()).toHaveText(
		"Bom de Bíblia (Junho)",
	);
});

test.describe("tela estreita", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("opens the main nav on a narrow screen and reaches the library", async ({
		page,
	}) => {
		await signUp(page);
		const nav = page.getByRole("navigation", { name: "Navegação principal" });
		await expect(nav).toBeHidden();

		await page.getByRole("button", { name: "Navegação" }).click();
		await expect(nav).toBeVisible();

		await nav.getByRole("link", { name: "Biblioteca" }).click();
		await expect(page).toHaveURL(/\/library/);
		await expect(nav).toBeHidden();
	});
});
