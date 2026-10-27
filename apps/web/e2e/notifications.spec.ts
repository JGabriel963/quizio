import { expect, type Page, test } from "@playwright/test";

import { newParticipant, signUp } from "./support";

/** Ana's group with Bruno in it, joined by the link (spec 034). */
async function groupWithBruno(ana: Page, bruno: Page, name: string) {
	await ana.goto("/groups");
	const create = ana.getByRole("dialog", { name: "Criar grupo" });
	// A click before hydration is lost: click again until it opens.
	await expect(async () => {
		await ana.getByRole("button", { name: "Criar grupo" }).first().click();
		await expect(create).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await create.getByLabel("Nome").fill(name);
	await create.getByRole("button", { name: "Criar grupo" }).click();
	await expect(ana.getByRole("heading", { name })).toBeVisible();
	const groupUrl = ana.url().replace(/\?.*$/, "");

	await ana.getByRole("button", { name: "Adicionar membros" }).click();
	const invite = ana.getByRole("dialog", { name: "Convidar usuários" });
	const field = invite.getByLabel("Compartilhar link de convite");
	await expect(field).toHaveValue(/\/invite\//);
	const link = await field.inputValue();
	await ana.keyboard.press("Escape");

	await bruno.goto(link);
	await bruno.getByRole("button", { name: "Aceitar convite" }).click();
	await expect(bruno.getByRole("heading", { name })).toBeVisible();
	return groupUrl;
}

const bell = (page: Page, news = false) =>
	page.getByRole("button", {
		name: news ? "Notificações, há novidades" : "Notificações",
		exact: true,
	});

async function openPanel(page: Page) {
	await expect(async () => {
		await page.getByRole("button", { name: /^Notificações/ }).click();
		await expect(
			page.getByRole("dialog", { name: "Notificações" }),
		).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	return page.getByRole("dialog", { name: "Notificações" });
}

test.describe("notificações (spec 040)", () => {
	test("a publicação de um membro acende o sino dos outros, abre a publicação e fica lida", async ({
		page: ana,
		browser,
	}) => {
		await signUp(ana, { name: "Ana Sino" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno Sino" });
		const groupUrl = await groupWithBruno(ana, bruno, "GRUPO SINO");
		await ana.goto("/");
		// The join is news for the admin; reading everything starts clean.
		const first = await openPanel(ana);
		await first
			.getByRole("button", { name: "Opções das notificações" })
			.click();
		await ana
			.getByRole("menuitem", { name: "Marcar todas como lidas" })
			.click();
		await ana.keyboard.press("Escape");

		await bruno.goto(groupUrl);
		const dialog = bruno.getByRole("dialog", { name: "Criar publicação" });
		// A click before hydration is lost: click again until it opens.
		await expect(async () => {
			await bruno.getByRole("button", { name: "Publicar algo" }).click();
			await expect(dialog).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 30_000 });
		await dialog.getByRole("textbox").fill("Prova na sexta");
		await dialog.getByRole("button", { name: "Publicar" }).click();
		await expect(dialog).toBeHidden();

		// Without reloading: the realtime hint, or the 60 s check (RN-11).
		await expect(bell(ana, true)).toBeVisible({ timeout: 70_000 });
		const panel = await openPanel(ana);
		await expect(bell(ana)).toBeVisible();
		const novo = panel.getByRole("list", { name: "Novo" });
		const item = novo.getByRole("button", {
			name: /Bruno Sino compartilhou uma nova postagem com o grupo GRUPO SINO/,
		});
		await expect(item).toBeVisible();
		await item.click();

		await expect(ana).toHaveURL(/\/groups\/[^/]+\/posts\//);
		await expect(ana.getByRole("article")).toContainText("Prova na sexta");

		const again = await openPanel(ana);
		await expect(
			again
				.getByRole("list", { name: "Anteriores" })
				.getByRole("button", { name: /compartilhou uma nova postagem/ }),
		).toBeVisible();
	});

	test("o administrador sabe da entrada de um membro e Marcar todas como lidas esvazia o Novo", async ({
		page: ana,
		browser,
	}) => {
		await signUp(ana, { name: "Ana Admin" });
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno Novo" });
		await groupWithBruno(ana, bruno, "GRUPO ENTRADA");
		await ana.goto("/");

		const panel = await openPanel(ana);
		await expect(
			panel.getByRole("list", { name: "Novo" }).getByRole("button", {
				name: /Bruno Novo entrou no grupo GRUPO ENTRADA/,
			}),
		).toBeVisible();
		await panel
			.getByRole("button", { name: "Opções das notificações" })
			.click();
		await ana
			.getByRole("menuitem", { name: "Marcar todas como lidas" })
			.click();

		await expect(panel.getByRole("list", { name: "Novo" })).toHaveCount(0);
		await expect(
			panel
				.getByRole("list", { name: "Anteriores" })
				.getByRole("button", { name: /entrou no grupo/ }),
		).toBeVisible();
	});

	test("no celular o painel ocupa a largura e fecha pelo sino", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile", "only on the phone");
		await signUp(page);

		const panel = await openPanel(page);
		await expect(panel.getByText("Você não tem notificações.")).toBeVisible();
		const box = await panel.boundingBox();
		const width = page.viewportSize()?.width ?? 0;
		expect(box?.width ?? 0).toBeGreaterThan(width - 24);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);

		await bell(page).click();
		await expect(panel).toBeHidden();
	});
});
