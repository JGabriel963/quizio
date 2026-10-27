import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

const shownTheme = (page: Page) =>
	page.locator('[data-slot="game-screen"]').first();
const canvas = (page: Page) => page.locator('[data-slot="editor-canvas"]');

/** "Temas" from the side rail, or from the ⋮ where the rail does not fit (spec 042, RN-28). */
async function chooseTheme(page: Page, isMobile: boolean, name: string) {
	if (isMobile) {
		await page
			.getByRole("button", { name: "Propriedades da pergunta" })
			.click();
		await page.getByRole("menuitem", { name: "Temas" }).click();
	} else {
		await page
			.getByRole("toolbar", { name: "Painéis do editor" })
			.getByRole("button", { name: "Temas" })
			.click();
	}
	await page.getByRole("radio", { name }).click();
	await expect(page.getByRole("radio", { name })).toHaveAttribute(
		"aria-checked",
		"true",
	);
	if (isMobile) {
		await page.getByRole("button", { name: "Fechar temas" }).click();
	}
}

test.describe("temas prontos (spec 042)", () => {
	test("o tema escolhido no editor chega ao lobby, ao celular e às perguntas", async ({
		page: host,
		browser,
		isMobile,
	}) => {
		await signUp(host);
		await createQuizInEditor(host);
		await host
			.getByRole("textbox", { name: "Título do quiz" })
			.fill("Capitais");
		await host
			.getByRole("textbox", { name: "Pergunta" })
			.fill("Capital do Brasil?");
		await host
			.getByRole("textbox", { name: "Resposta 1", exact: true })
			.fill("Brasília");
		await host
			.getByRole("textbox", { name: "Resposta 2", exact: true })
			.fill("Rio de Janeiro");
		await host.getByRole("textbox", { name: "Resposta 2", exact: true }).blur();
		await host.getByRole("checkbox", { name: "Resposta 1 correta" }).click();

		// CA-06, CA-15: chosen, shown at once and saved.
		await chooseTheme(host, isMobile, "Azul claro");
		await expect(canvas(host)).toHaveAttribute("data-theme", "light-blue");
		await expectSaved(host);
		if (isMobile) {
			expect(
				await host.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						document.documentElement.clientWidth,
				),
			).toBe(true);
		}
		await host.reload();
		await expect(canvas(host)).toHaveAttribute("data-theme", "light-blue");

		await host.getByRole("button", { name: "Salvar", exact: true }).click();
		const ready = host.getByRole("dialog", { name: "O quiz está pronto" });
		await ready.getByRole("button", { name: /Organizar ao vivo/ }).click();

		// CA-17: the lobby wears the quiz's theme.
		const pin = await lobbyPin(host);
		await expect(shownTheme(host)).toHaveAttribute("data-theme", "light-blue");

		// CA-20: the PIN entry is standard; the screens after it, the game's.
		const player = await newParticipant(browser);
		await player.goto("/join");
		await expect(shownTheme(player)).toHaveAttribute("data-theme", "standard");
		await player.getByRole("textbox", { name: "PIN" }).fill(pin);
		await player.getByRole("button", { name: "Entrar" }).click();
		await expect(
			player.getByRole("textbox", { name: "Apelido" }),
		).toBeVisible();
		await expect(shownTheme(player)).toHaveAttribute(
			"data-theme",
			"light-blue",
		);
		await enterNickname(player, "Ana");
		await expect(player.getByRole("heading", { name: "Ana" })).toBeVisible();
		await expect(shownTheme(player)).toHaveAttribute(
			"data-theme",
			"light-blue",
		);

		// The game itself, on the host's screen.
		await host.getByRole("button", { name: /Iniciar/ }).click();
		await expect(host.getByText("Capital do Brasil?")).toBeVisible({
			timeout: 15_000,
		});
		await expect(shownTheme(host)).toHaveAttribute("data-theme", "light-blue");
	});
});
