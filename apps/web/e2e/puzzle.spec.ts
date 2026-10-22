import { expect, type Page, test } from "@playwright/test";

import {
	chooseProperty,
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

/** A phase lasts up to 6.5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 20_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const blocks = (page: Page) => page.locator('[data-slot="puzzle-block"]');

/** The blocks' texts, top to bottom. */
async function blockTexts(page: Page): Promise<string[]> {
	return (await blocks(page).allTextContents()).map((text) => text.trim());
}

/**
 * Puts the phone's blocks in `order` with ↑ alone, as a keyboard user would:
 * each text climbs from where it is to its place.
 */
async function arrange(page: Page, order: readonly string[]) {
	for (const [place, text] of order.entries()) {
		const at = (await blockTexts(page)).indexOf(text);
		const handle = page.getByRole("button", { name: `Mover ${text}` });
		await handle.focus();
		for (let step = at; step > place; step--) {
			await page.keyboard.press("ArrowUp");
		}
		await expect.poll(() => blockTexts(page)).toContain(text);
	}
	await expect.poll(() => blockTexts(page)).toEqual([...order]);
}

/** A playable quiz with one puzzle, "Amazonas", "Nilo", "Yangtzé" in that order. */
async function publishPuzzleQuiz(page: Page, title: string) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await chooseProperty(page, "Tipo de pergunta", "Puzzle");
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Coloque estes rios do maior para o menor");
	// CA-02: four slots, the fourth optional, and the hint.
	await expect(
		page.getByRole("textbox", { name: "Resposta 4" }),
	).toHaveAttribute("placeholder", "Adicionar resposta 4 (opcional)");
	await expect(
		page.getByText("Adicione no mínimo 3 respostas na ordem correta."),
	).toBeVisible();
	for (const [index, text] of ["Nilo", "Amazonas", "Yangtzé"].entries()) {
		const field = page.getByRole("textbox", { name: `Resposta ${index + 1}` });
		await field.fill(text);
		await field.blur();
	}
	// CA-04: the keyboard takes Amazonas to the top; the colors stay put.
	await page.getByRole("button", { name: "Mover Amazonas" }).focus();
	await page.keyboard.press("ArrowUp");
	await expect(page.getByRole("textbox", { name: "Resposta 1" })).toHaveValue(
		"Amazonas",
	);
	await expect(page.getByRole("textbox", { name: "Resposta 2" })).toHaveValue(
		"Nilo",
	);
	await expectSaved(page);

	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

test.describe("puzzle (spec 033)", () => {
	test("creates a puzzle, plays it live and reveals the right order", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(host);
		await publishPuzzleQuiz(host, "Rios");

		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		const ana = await newParticipant(browser);
		await ana.emulateMedia({ reducedMotion: "reduce" });
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		await expect(host.locator('[data-slot="player-count"]')).toHaveText("1");

		// The phone gets the texts with the questions on the devices.
		await host.getByRole("button", { name: "Configurações" }).click();
		const settings = host.getByRole("dialog", { name: "Configurações" });
		await settings
			.getByRole("switch", { name: "Mostrar perguntas nos dispositivos" })
			.click();
		await settings.getByRole("button", { name: "Fechar" }).click();
		await host.getByRole("button", { name: "Iniciar" }).click();

		// CA-15: the same drawn order on both screens, never the right one.
		await expect(blocks(ana)).toHaveCount(3, NEXT_PHASE);
		const drawn = await blockTexts(ana);
		expect(drawn).not.toEqual(["Amazonas", "Nilo", "Yangtzé"]);
		await expect(
			host
				.getByRole("list", { name: "Respostas" })
				.locator('[data-slot="puzzle-block"]'),
		).toHaveText(drawn);

		// CA-17: the keyboard puts them in order; Enviar sends it.
		await arrange(ana, ["Amazonas", "Nilo", "Yangtzé"]);
		await ana.getByRole("button", { name: "Enviar" }).click();

		// CA-19: the right order on the host's screen, Correto on the phone.
		await expect(
			host
				.getByRole("list", { name: "Ordem correta" })
				.locator('[data-slot="puzzle-block"]'),
		).toHaveText(["Amazonas", "Nilo", "Yangtzé"], NEXT_PHASE);
		await expect(host.getByLabel("1 acertaram")).toBeVisible();
		await expect(
			ana.getByRole("heading", { name: "Correto", exact: true }),
		).toBeVisible();
	});
});
