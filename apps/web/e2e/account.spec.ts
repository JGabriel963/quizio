import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, PNG_1PX, signUp, useUniqueClientIp } from "./support";

const NEW_PASSWORD = "nova-senha-e2e-456";

/** The account menu, opened by the photo in the top bar (spec 039, RN-01). */
async function openAccountMenu(page: Page, name: string) {
	const trigger = page.getByRole("banner").getByRole("button", { name });
	// A click before hydration is lost: click again until the menu opens.
	await expect(async () => {
		await trigger.click();
		await expect(page.getByRole("menu")).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	return page.getByRole("menu");
}

async function signInWith(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Senha", { exact: true }).fill(password);
	await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
}

test.describe("conta e perfil (spec 039)", () => {
	test("carrega uma foto recortada que aparece na barra superior", async ({
		page,
	}) => {
		const { name } = await signUp(page);
		await page.goto("/settings?section=profile");

		await expect(async () => {
			await page.getByRole("button", { name: "Adicionar foto" }).click();
			await expect(
				page.getByRole("dialog", { name: "Carregar imagem" }),
			).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 30_000 });
		const dialog = page.getByRole("dialog", { name: "Carregar imagem" });
		await dialog.getByLabel("Carregar imagem").setInputFiles({
			name: "foto.png",
			mimeType: "image/png",
			buffer: PNG_1PX,
		});
		await expect(dialog.getByRole("slider", { name: "Zoom" })).toBeVisible();
		await dialog.getByRole("button", { name: "Carregar" }).click();
		await expect(dialog).toBeHidden();

		// The photo shows at once, without reloading (CA-04).
		await expect(
			page.getByRole("banner").getByRole("button", { name }).locator("img"),
		).toHaveAttribute("src", /\/profiles\//);
		await expect(
			page.getByRole("button", { name: "Alterar foto" }).locator("img"),
		).toBeVisible();
	});

	test("troca a senha e a antiga deixa de valer", async ({ page }) => {
		const { name, email } = await signUp(page);
		await page.goto("/settings?section=password");
		await page.getByLabel("Senha atual", { exact: true }).fill(E2E_PASSWORD);
		await page.getByLabel("Nova senha", { exact: true }).fill(NEW_PASSWORD);
		await page
			.getByLabel("Repita a nova senha", { exact: true })
			.fill(NEW_PASSWORD);
		await page.getByRole("button", { name: "Alterar senha" }).click();
		await expect(page.getByText("Senha alterada")).toBeVisible();

		const menu = await openAccountMenu(page, name);
		await menu.getByRole("menuitem", { name: "Encerrar sessão" }).click();
		await expect(page).toHaveURL(/\/$/);

		await signInWith(page, email, E2E_PASSWORD);
		await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
		await signInWith(page, email, NEW_PASSWORD);
		await expect(page).toHaveURL(/\/$/);
		await expect(
			page.getByRole("banner").getByRole("button", { name }),
		).toBeVisible();
	});

	test("encerrar sessão leva à página pública", async ({ page }) => {
		const { name } = await signUp(page);

		const menu = await openAccountMenu(page, name);
		await expect(menu.getByRole("menuitem")).toHaveText([
			"Ver perfil",
			"Agentes de IA",
			"Configurações",
			"Encerrar sessão",
		]);
		await menu.getByRole("menuitem", { name: "Encerrar sessão" }).click();

		await expect(page).toHaveURL(/\/$/);
		await expect(
			page.getByRole("main").getByRole("link", { name: "Entrar" }),
		).toBeVisible();
	});

	test("o link do perfil sem sessão leva a entrar e volta ao perfil", async ({
		page,
		browser,
	}) => {
		const { name, email } = await signUp(page);
		const menu = await openAccountMenu(page, name);
		const href = await menu
			.getByRole("menuitem", { name: "Ver perfil" })
			.getAttribute("href");
		expect(href).toMatch(/^\/profile\//);

		const visitor = await (await browser.newContext()).newPage();
		await useUniqueClientIp(visitor);
		await visitor.goto(href ?? "");
		await expect(visitor).toHaveURL(/\/login\?redirect=/);
		await visitor.getByLabel("E-mail").fill(email);
		await visitor.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
		await visitor
			.getByRole("main")
			.getByRole("button", { name: "Entrar" })
			.click();

		await expect(visitor).toHaveURL(new RegExp(`${href}$`));
		await expect(
			visitor.getByRole("heading", { level: 1, name }),
		).toBeVisible();
	});

	test("exclui a conta e não consegue mais entrar", async ({ page }) => {
		const { email } = await signUp(page);
		await page.goto("/settings?section=delete");

		await expect(async () => {
			await page.getByRole("button", { name: "Excluir conta" }).click();
			await expect(page.getByLabel("Motivo para excluir a conta")).toBeVisible({
				timeout: 2_000,
			});
		}).toPass({ timeout: 30_000 });
		await page
			.getByLabel("Motivo para excluir a conta")
			.selectOption({ label: "Eu não uso esta conta" });
		await page
			.getByLabel("Gostaria de compartilhar algum feedback? (opcional)")
			.fill("Obrigada pelo Quizio");
		await page.getByRole("button", { name: "Excluir conta" }).click();

		const confirm = page.getByRole("alertdialog", {
			name: "Excluir sua conta?",
		});
		await confirm.getByLabel("Senha").fill(E2E_PASSWORD);
		await confirm.getByRole("button", { name: "Excluir minha conta" }).click();

		await expect(page.getByText("Sua conta foi excluída.")).toBeVisible();
		await expect(page).toHaveURL(/\/$/);
		await signInWith(page, email, E2E_PASSWORD);
		await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
	});
});
