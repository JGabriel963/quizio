import { type Browser, expect, type Page } from "@playwright/test";

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
	await page.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
	await page.getByRole("button", { name: "Criar conta" }).click();
	// Signing in with no requested page lands on the dashboard (spec 002, RN-02).
	await expect(page).toHaveURL(/\/$/);
	return { name, email };
}

export async function signIn(page: Page, email: string) {
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
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

/**
 * Criar opens the editor of a new draft (spec 003, RN-04). The E2E server has
 * the creation assistant on (AI_PROVIDER=fake), so "Criar um novo quiz" comes
 * first, maybe a moment after the editor: "Tela em branco" leaves the editor
 * as it was (spec 027, RN-03).
 */
export async function createQuizInEditor(page: Page) {
	await page.getByRole("button", { name: "Criar", exact: true }).click();
	await expect(page).toHaveURL(/\/creator\//);
	const newQuiz = page.getByRole("dialog", { name: "Criar um novo quiz" });
	await newQuiz.getByRole("button", { name: /Tela em branco/ }).click();
	await expect(newQuiz).toBeHidden();
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

type PropertyLabel =
	| "Tipo de pergunta"
	| "Limite de tempo"
	| "Pontos"
	| "Opções de resposta";

/** On narrow screens each property opens from the ⋮ beside the question text, in a dialog (as in Kahoot). */
const PROPERTY_MENU: Record<PropertyLabel, { item: string; dialog: string }> = {
	"Tipo de pergunta": {
		item: "Alterar tipo de pergunta",
		dialog: "Alterar tipo de pergunta",
	},
	"Limite de tempo": {
		item: "Definir limite de tempo",
		dialog: "Limite de tempo",
	},
	Pontos: { item: "Pontos", dialog: "Pontos" },
	"Opções de resposta": {
		item: "Opções de resposta",
		dialog: "Opções de resposta",
	},
};

const propertiesMenu = (page: Page) =>
	page.getByRole("button", { name: "Propriedades da pergunta" });

/** Wide screens show the properties panel; narrow ones only the ⋮. */
const hasPropertiesPanel = async (page: Page) =>
	!(await propertiesMenu(page).isVisible());

async function openPropertyDialog(page: Page, label: PropertyLabel) {
	await propertiesMenu(page).click();
	await page.getByRole("menuitem", { name: PROPERTY_MENU[label].item }).click();
	const dialog = page.getByRole("dialog", {
		name: PROPERTY_MENU[label].dialog,
	});
	await expect(dialog).toBeVisible();
	return dialog;
}

export async function chooseProperty(
	page: Page,
	label: PropertyLabel,
	option: string,
) {
	if (await hasPropertiesPanel(page)) {
		await propertySelect(page, label).click();
		await page.getByRole("option", { name: option, exact: true }).click();
		await expect(page.getByRole("option")).toHaveCount(0);
		return;
	}
	const dialog = await openPropertyDialog(page, label);
	await dialog.getByRole("radio", { name: option, exact: true }).click();
	// A type changes when picked; the others wait for Pronto.
	if (label !== "Tipo de pergunta") {
		await dialog.getByRole("button", { name: "Pronto" }).click();
	}
	await expect(dialog).toBeHidden();
}

/** The value a property shows: in the panel's select, or checked in its dialog. */
export async function expectProperty(
	page: Page,
	label: PropertyLabel,
	value: string,
) {
	if (await hasPropertiesPanel(page)) {
		await expect(propertySelect(page, label)).toHaveText(value);
		return;
	}
	const dialog = await openPropertyDialog(page, label);
	await expect(
		dialog.getByRole("radio", { name: value, exact: true }),
	).toBeChecked();
	await dialog.getByRole("button", { name: "Cancelar" }).click();
	await expect(dialog).toBeHidden();
}

/** A property the question's type does not have (true/false has no answer options). */
export async function expectNoProperty(page: Page, label: PropertyLabel) {
	if (await hasPropertiesPanel(page)) {
		await expect(propertySelect(page, label)).toHaveCount(0);
		return;
	}
	await propertiesMenu(page).click();
	await expect(
		page.getByRole("menuitem", { name: PROPERTY_MENU[label].item }),
	).toHaveCount(0);
	const menu = page.getByRole("menu");
	await menu.press("Escape");
	await expect(menu).toBeHidden();
}

/** "Aplicar a todas as perguntas" with the selected question's time limit. */
export async function applyTimeLimitToAll(page: Page) {
	if (await hasPropertiesPanel(page)) {
		await page
			.getByRole("button", { name: "Aplicar a todas as perguntas" })
			.click();
		return;
	}
	const dialog = await openPropertyDialog(page, "Limite de tempo");
	await dialog
		.getByRole("button", { name: "Aplicar a todas as perguntas" })
		.click();
	await expect(dialog).toBeHidden();
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

/** Each participant of a live game is another browser, as in a real game. */
export async function newParticipant(browser: Browser): Promise<Page> {
	const context = await browser.newContext();
	const page = await context.newPage();
	await useUniqueClientIp(page);
	return page;
}

/** The host's lobby is open: returns the PIN as the player types it. */
export async function lobbyPin(host: Page): Promise<string> {
	await expect(host).toHaveURL(/\/host\//);
	const pin = host.locator('[data-slot="game-pin"]');
	await expect(pin).toHaveText(/^\d{3} \d{3}$/);
	return ((await pin.textContent()) ?? "").replace(" ", "");
}

export async function enterNickname(player: Page, nickname: string) {
	await player.getByRole("textbox", { name: "Apelido" }).fill(nickname);
	await player.getByRole("button", { name: "Ok, vamos lá!" }).click();
}

/** A saved quiz of one question, the first answer right (spec 006). */
export async function publishedQuiz(page: Page, title: string, right: string) {
	await page.goto("/library");
	// A click before hydration is lost: click again until the editor opens.
	await expect(async () => {
		await page.getByRole("button", { name: "Criar", exact: true }).click();
		await expect(page).toHaveURL(/\/creator\//, { timeout: 3_000 });
	}).toPass({ timeout: 30_000 });
	const newQuiz = page.getByRole("dialog", { name: "Criar um novo quiz" });
	await newQuiz.getByRole("button", { name: /Tela em branco/ }).click();
	await expect(newQuiz).toBeHidden();
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill(`Pergunta de ${title}?`);
	await page
		.getByRole("textbox", { name: "Resposta 1", exact: true })
		.fill(right);
	await page
		.getByRole("textbox", { name: "Resposta 2", exact: true })
		.fill("Outra");
	await page.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(
		page.getByRole("dialog", { name: "O quiz está pronto" }),
	).toBeVisible();
}
