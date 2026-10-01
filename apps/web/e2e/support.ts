import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "senha-e2e-123";

/** Unique per test and per project, so tests never share accounts or data. */
export function uniqueEmail(): string {
	return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@quizio.test`;
}

let nextClientIp = 1;

/**
 * Sign-in and sign-up are rate limited per client IP (spec 001, RN-07). Every
 * test acts as a different client so parallel runs never block each other.
 */
export async function useUniqueClientIp(page: Page) {
	const ip = `198.51.${process.pid % 250}.${nextClientIp++ % 250}`;
	await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
}

/** Smallest valid PNG (1×1 pixel). */
export const PNG_1PX = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

export async function signUp(
	page: Page,
	{
		name = "Ana E2E",
		email = uniqueEmail(),
	}: { name?: string; email?: string } = {},
) {
	await useUniqueClientIp(page);
	await page.goto("/login?mode=sign-up");
	await page.getByLabel("Nome").fill(name);
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha").fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Criar conta" }).click();
	// Signing in with no requested page lands on the dashboard (spec 002, RN-02).
	await expect(page).toHaveURL(/\/$/);
	return { name, email };
}

export async function signIn(page: Page, email: string) {
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha").fill(E2E_PASSWORD);
	await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
}

/** Opens the library, whatever screen the test is on. */
export async function goToLibrary(page: Page) {
	await page.goto("/library");
	await expect(page).toHaveURL(/\/library/);
}

export function quizList(page: Page) {
	return page.getByRole("list", { name: "Quizzes" });
}

/** Criar opens the editor of a new draft (spec 003, RN-04). */
export async function createQuizInEditor(page: Page) {
	await page.getByRole("button", { name: "Criar", exact: true }).click();
	await expect(page).toHaveURL(/\/creator\//);
	await expect(page.getByRole("textbox", { name: "Pergunta" })).toBeVisible();
}

/** "Adicionar" opens the type picker; the question list must be visible (spec 005, RN-02). */
export async function pickNewQuestionType(
	page: Page,
	type: "Quiz" | "Verdadeiro ou falso" = "Quiz",
) {
	await page.getByRole("button", { name: "Adicionar", exact: true }).click();
	await page.getByRole("menuitem", { name: type, exact: true }).click();
}

/** A property of the editor's right panel, chosen in its select (a combobox with a list of options). */
export function propertySelect(page: Page, label: string) {
	return page.getByRole("combobox", { name: label });
}

export async function chooseProperty(
	page: Page,
	label: string,
	option: string,
) {
	await propertySelect(page, label).click();
	await page.getByRole("option", { name: option, exact: true }).click();
	await expect(page.getByRole("option")).toHaveCount(0);
}

/** Waits until the editor reports every change as saved. */
export async function expectSaved(page: Page) {
	await expect(
		page.getByRole("status").filter({ hasText: "Salvo" }),
	).toBeVisible();
}

export async function createQuiz(
	page: Page,
	{
		title,
		description,
		withCover = false,
	}: { title: string; description?: string; withCover?: boolean },
) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	if (description || withCover) {
		await page.getByRole("button", { name: "Configurações" }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByLabel("Título")).toHaveValue(title);
		if (description) {
			await dialog.getByLabel("Descrição").fill(description);
		}
		if (withCover) {
			await dialog.getByLabel("Enviar capa").setInputFiles({
				name: "capa.png",
				mimeType: "image/png",
				buffer: PNG_1PX,
			});
			await expect(
				dialog.getByRole("img", { name: "Capa do quiz" }),
			).toBeVisible();
		}
		await dialog.getByRole("button", { name: "Salvar" }).click();
		await expect(dialog).toBeHidden();
	}
	await expectSaved(page);
	await goToLibrary(page);
	await expect(quizList(page).getByRole("link", { name: title })).toBeVisible();
}

export async function openQuizActions(page: Page, title: string) {
	await page.getByRole("button", { name: `Ações para ${title}` }).click();
}
