import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const playerCard = (host: Page, nickname: string) =>
	host
		.getByRole("list", { name: "Participantes" })
		.getByRole("button")
		.filter({ hasText: nickname });
const settings = (host: Page) =>
	host.getByRole("dialog", { name: "Configurações" });

/** A quiz with one complete question, saved as playable; ends on "O quiz está pronto". */
async function publishQuiz(page: Page, title: string) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Capital do Brasil?");
	await page
		.getByRole("textbox", { name: "Resposta 1", exact: true })
		.fill("Brasília");
	await page
		.getByRole("textbox", { name: "Resposta 2", exact: true })
		.fill("Rio de Janeiro");
	await page.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await expectSaved(page);
	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

test.describe("personagens dos jogadores (spec 028)", () => {
	test("o jogador troca o personagem, o anfitrião vê e desliga os personagens", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(90_000);
		await signUp(host);
		await publishQuiz(host, "Capitais");
		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);

		// CA-01: who joins has an avatar, on the phone and in the lobby.
		const ana = await newParticipant(browser);
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		const card = ana.getByTestId("avatar-card");
		await expect(card.locator("img").first()).toBeVisible();
		await expect(playerCard(host, "Ana").locator("img").first()).toBeVisible();

		// CA-05: a tap changes the avatar on both screens, before "Pronto".
		await ana.getByRole("button", { name: "Editar avatar" }).click();
		await ana.getByRole("button", { name: "Tigre" }).click();
		await expect(
			playerCard(host, "Ana").locator(
				'img[src="/avatars/characters/tiger.svg"]',
			),
		).toBeVisible();
		await ana.getByRole("tab", { name: "Acessório" }).click();
		await ana.getByRole("button", { name: "Coroa" }).click();
		await expect(
			playerCard(host, "Ana").locator(
				'img[src="/avatars/accessories/crown.svg"]',
			),
		).toBeVisible();
		await ana.getByRole("button", { name: "Pronto" }).click();
		await expect(
			card.locator('img[src="/avatars/characters/tiger.svg"]'),
		).toBeVisible();

		// CA-19: the host turns the characters off; both screens show the nickname only.
		await host.getByRole("button", { name: "Configurações" }).click();
		const characters = settings(host).getByRole("switch", {
			name: "Personagens dos jogadores",
		});
		await expect(characters).toHaveAttribute("aria-checked", "true");
		await characters.click();
		await expect(characters).toHaveAttribute("aria-checked", "false");
		await settings(host).getByRole("button", { name: "Fechar" }).click();
		await expect(playerCard(host, "Ana").locator("img")).toHaveCount(0);
		await expect(ana.getByTestId("avatar-card")).toHaveCount(0);
		await expect(
			ana.getByRole("button", { name: "Editar avatar" }),
		).toHaveCount(0);
		await expect(
			ana.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();

		// The setting is the host's: turned back on, so the next tests start as usual.
		await host.getByRole("button", { name: "Configurações" }).click();
		await characters.click();
		await expect(characters).toHaveAttribute("aria-checked", "true");
	});
});
