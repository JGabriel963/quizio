import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, newParticipant, signUp, uniqueEmail } from "./support";

/** Creates a group from the list and lands on its page (spec 034, CA-03). */
async function createGroup(page: Page, name: string) {
	await page.goto("/groups");
	const dialog = page.getByRole("dialog", { name: "Criar grupo" });
	// A click before hydration is lost (a cold dev server may even reload the
	// page while it optimizes dependencies): click again until it opens.
	await expect(async () => {
		await page.getByRole("button", { name: "Criar grupo" }).first().click();
		await expect(dialog).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await dialog.getByLabel("Nome").fill(name);
	await dialog.getByRole("button", { name: "Criar grupo" }).click();
	await expect(page).toHaveURL(/\/groups\/[^/?]+\?tab=activity/);
	await expect(page.getByRole("heading", { name })).toBeVisible();
	return page.url().replace(/\?.*$/, "");
}

/** Opens "Convidar usuários" and reads the link (CA-13). */
async function inviteLink(page: Page) {
	await page.getByRole("button", { name: "Adicionar membros" }).click();
	const dialog = page.getByRole("dialog", { name: "Convidar usuários" });
	const field = dialog.getByLabel("Compartilhar link de convite");
	await expect(field).toHaveValue(/\/invite\/[\w-]{22}$/);
	return { dialog, link: await field.inputValue() };
}

async function acceptInvite(guest: Page, link: string, group: string) {
	await guest.goto(link);
	await expect(
		guest.getByRole("heading", {
			name: "O convite para entrar no grupo aguarda sua resposta",
		}),
	).toBeVisible();
	await expect(guest.getByText(group)).toBeVisible();
	await guest.getByRole("button", { name: "Aceitar convite" }).click();
	await expect(guest.getByRole("heading", { name: group })).toBeVisible();
}

test.describe("grupos (spec 034)", () => {
	test("cria um grupo, convida um membro pelo link e o vê entre os membros", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(ana, { name: "Ana" });
		const groupUrl = await createGroup(ana, "Turma 7A");
		const { dialog, link } = await inviteLink(ana);
		await dialog.getByRole("button", { name: "Fechar" }).last().click();

		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		await acceptInvite(bruno, link, "Turma 7A");
		// A member: no Adicionar membros (CA-08).
		await expect(
			bruno.getByRole("button", { name: "Adicionar membros" }),
		).toHaveCount(0);

		await ana.goto(`${groupUrl}/members`);
		await expect(ana.getByText("2 de 2 membros do grupo")).toBeVisible();
		const table = ana.getByRole("table", { name: "Membros do grupo" });
		await expect(table.getByText("Administrador")).toBeVisible();
		await expect(table.getByText("Bruno")).toBeVisible();

		// "Convidar membros" is done now (CA-10).
		await ana.goto(groupUrl);
		await expect(
			ana.getByRole("button", { name: "Convidar membros (feito)" }),
		).toBeVisible();
	});

	test("quem não tem sessão entra e volta ao convite; um link redefinido deixa de valer", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(ana, { name: "Ana" });
		await createGroup(ana, "Coral");
		const { dialog, link: oldLink } = await inviteLink(ana);
		await dialog.getByRole("button", { name: "Redefinir link" }).click();
		await ana
			.getByRole("alertdialog", { name: "Redefinir o link de convite?" })
			.getByRole("button", { name: "Redefinir" })
			.click();
		const field = dialog.getByLabel("Compartilhar link de convite");
		await expect(field).not.toHaveValue(oldLink);
		const newLink = await field.inputValue();

		// Carla has no session: the old link sends her to sign in first (CA-16).
		const carla = await newParticipant(browser);
		const email = uniqueEmail();
		await carla.goto(oldLink);
		await expect(carla).toHaveURL(/\/login/);
		await carla.getByRole("button", { name: "Criar conta" }).click();
		await carla.getByLabel("Nome").fill("Carla");
		await carla.getByLabel("E-mail").fill(email);
		await carla.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
		await carla.getByRole("button", { name: "Criar conta" }).click();
		await expect(
			carla.getByRole("heading", { name: "Este convite não é mais válido" }),
		).toBeVisible();

		await acceptInvite(carla, newLink, "Coral");
	});

	test("o administrador remove um membro e exclui o grupo", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(ana, { name: "Ana" });
		const groupUrl = await createGroup(ana, "Jovens");
		const { link } = await inviteLink(ana);
		const bruno = await newParticipant(browser);
		await signUp(bruno, { name: "Bruno" });
		await acceptInvite(bruno, link, "Jovens");

		await ana.goto(`${groupUrl}/members`);
		await ana.getByRole("button", { name: "Ações para Bruno" }).click();
		await ana.getByRole("menuitem", { name: "Remover" }).click();
		await ana
			.getByRole("alertdialog", { name: "Remover Bruno do grupo?" })
			.getByRole("button", { name: "Remover" })
			.click();
		await expect(ana.getByText("1 de 1 membros do grupo")).toBeVisible();

		await bruno.goto(groupUrl);
		await expect(
			bruno.getByRole("heading", { name: "Grupo não encontrado" }),
		).toBeVisible();

		await ana.goto(groupUrl);
		await ana.getByRole("button", { name: "Opções do grupo" }).click();
		await ana.getByRole("menuitem", { name: "Excluir grupo" }).click();
		await ana
			.getByRole("alertdialog", { name: "Excluir Jovens?" })
			.getByRole("button", { name: "Excluir" })
			.click();
		await expect(ana).toHaveURL(/\/groups\?section=managed/);
		await expect(ana.getByRole("link", { name: /Jovens/ })).toHaveCount(0);

		await bruno.goto(link);
		await expect(
			bruno.getByRole("heading", { name: "Este convite não é mais válido" }),
		).toBeVisible();
	});
});
