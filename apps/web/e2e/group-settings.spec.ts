import { expect, type Page, test } from "@playwright/test";

import { newParticipant, signUp } from "./support";

/** Ana's group with Bruno in it, joined by the link (spec 034). */
async function groupWithBruno(ana: Page, bruno: Page) {
	await signUp(ana, { name: "Ana" });
	await ana.goto("/groups");
	const create = ana.getByRole("dialog", { name: "Criar grupo" });
	// A click before hydration is lost: click again until it opens.
	await expect(async () => {
		await ana.getByRole("button", { name: "Criar grupo" }).first().click();
		await expect(create).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 30_000 });
	await create.getByLabel("Nome").fill("Turma 7A");
	await create.getByRole("button", { name: "Criar grupo" }).click();
	await expect(ana.getByRole("heading", { name: "Turma 7A" })).toBeVisible();
	const groupUrl = ana.url().replace(/\?.*$/, "");

	await ana.getByRole("button", { name: "Adicionar membros" }).click();
	const invite = ana.getByRole("dialog", { name: "Convidar usuários" });
	const field = invite.getByLabel("Compartilhar link de convite");
	await expect(field).toHaveValue(/\/invite\//);
	const link = await field.inputValue();
	await ana.keyboard.press("Escape");

	await signUp(bruno, { name: "Bruno" });
	await bruno.goto(link);
	await bruno.getByRole("button", { name: "Aceitar convite" }).click();
	await expect(bruno.getByRole("heading", { name: "Turma 7A" })).toBeVisible();
	return groupUrl;
}

/** Turns a switch of "Configurações do grupo" and waits for it to stay. */
async function turnSwitch(ana: Page, groupUrl: string, name: string) {
	await ana.goto(`${groupUrl}/settings`);
	const toggle = ana.getByRole("switch", { name });
	const before = await toggle.isChecked();
	await toggle.click();
	await expect(toggle).toBeChecked({ checked: !before });
	await ana.reload();
	await expect(ana.getByRole("switch", { name })).toBeChecked({
		checked: !before,
	});
}

test.describe("configurações do grupo (spec 035)", () => {
	test("o administrador renomeia e descreve o grupo; o membro vê", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		const bruno = await newParticipant(browser);
		const groupUrl = await groupWithBruno(ana, bruno);

		await ana.goto(groupUrl);
		await ana.getByRole("button", { name: "Configurações do grupo" }).click();
		await expect(ana).toHaveURL(/\/settings$/);
		await ana.getByRole("button", { name: "Editar" }).click();
		const details = ana.getByRole("dialog", { name: "Nome e descrição" });
		await details.getByLabel("Nome").fill("Turma 7B");
		await details.getByLabel("Descrição").fill("Revisão para a prova");
		await details.getByRole("button", { name: "Salvar" }).click();
		await expect(details).toBeHidden();

		await bruno.goto(groupUrl);
		await expect(
			bruno.getByRole("heading", { name: "Turma 7B" }),
		).toBeVisible();
		await bruno.getByRole("button", { name: "Opções do grupo" }).click();
		await bruno.getByRole("menuitem", { name: "Informações do grupo" }).click();
		await expect(
			bruno
				.getByRole("dialog", { name: "Informações do grupo" })
				.getByText("Revisão para a prova"),
		).toBeVisible();
	});

	test("o membro convida enquanto o administrador permite", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		const bruno = await newParticipant(browser);
		const groupUrl = await groupWithBruno(ana, bruno);

		// On by default, without Redefinir link (CA-10).
		await bruno.goto(groupUrl);
		await bruno.getByRole("button", { name: "Adicionar membros" }).click();
		const invite = bruno.getByRole("dialog", { name: "Convidar usuários" });
		await expect(invite.getByLabel("Compartilhar link de convite")).toHaveValue(
			/\/invite\//,
		);
		await expect(
			invite.getByRole("button", { name: "Redefinir link" }),
		).toHaveCount(0);

		await turnSwitch(ana, groupUrl, "Os membros podem convidar outras pessoas");
		await bruno.goto(groupUrl);
		await expect(
			bruno.getByRole("heading", { name: "Turma 7A" }),
		).toBeVisible();
		await expect(
			bruno.getByRole("button", { name: "Adicionar membros" }),
		).toHaveCount(0);
	});

	test("a lista oculta deixa o membro só com o total", async ({
		page: ana,
		browser,
	}) => {
		test.setTimeout(90_000);
		const bruno = await newParticipant(browser);
		const groupUrl = await groupWithBruno(ana, bruno);

		await turnSwitch(ana, groupUrl, "Os membros podem ver quem está no grupo");

		await bruno.goto(`${groupUrl}/members`);
		await expect(
			bruno.getByText("O administrador ocultou a lista de membros."),
		).toBeVisible();
		await bruno.goto(groupUrl);
		await bruno.getByRole("button", { name: "Opções do grupo" }).click();
		await expect(
			bruno.getByRole("menuitem", { name: "Ver membros" }),
		).toHaveCount(0);
		await bruno.getByRole("menuitem", { name: "Informações do grupo" }).click();
		await expect(
			bruno.getByRole("dialog", { name: "Informações do grupo" }),
		).toContainText("2 membros");
	});
});
