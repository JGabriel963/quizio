import { expect, type Locator, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	signUp,
} from "./support";

/** A phase lasts up to 5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 15_000 };

const statement = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const toolbar = (page: Page) =>
	page.getByRole("toolbar", { name: "Formatação do enunciado" });

/** Pastes what a document gives the clipboard: its HTML and its plain text. */
async function pasteHtml(field: Locator, html: string, plain: string) {
	await field.evaluate(
		(element, data) => {
			const transfer = new DataTransfer();
			transfer.setData("text/html", data.html);
			transfer.setData("text/plain", data.plain);
			element.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData: transfer,
					bubbles: true,
					cancelable: true,
				}),
			);
		},
		{ html, plain },
	);
}

/**
 * Waits until the editor itself holds the selection the keyboard made: it
 * learns it from the browser a moment later, and a shortcut sent before that
 * would apply to the old cursor.
 */
async function expectSelected(field: Locator, text: string) {
	await expect
		.poll(() =>
			field.evaluate((element) => {
				const { editor } = element as HTMLElement & {
					editor?: {
						state: {
							selection: { from: number; to: number };
							doc: { textBetween: (from: number, to: number) => string };
						};
					};
				};
				if (!editor) {
					return null;
				}
				const { from, to } = editor.state.selection;
				return editor.state.doc.textBetween(from, to);
			}),
		)
		.toBe(text);
}

async function clear(page: Page) {
	await statement(page).click();
	await page.keyboard.press("ControlOrMeta+A");
	await page.keyboard.press("Backspace");
}

test.describe("formatação do enunciado (spec 047)", () => {
	test("barra, marcas, atalhos, desfazer, limite, colar e símbolos no editor", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the keyboard shortcuts are a computer's");
		test.setTimeout(120_000);
		await signUp(page);
		await createQuizInEditor(page);
		const field = statement(page);

		// CA-01: the bar shows only while the statement has the focus.
		await expect(toolbar(page)).toHaveCount(0);
		await field.click();
		await expect(toolbar(page)).toBeVisible();
		await expect(toolbar(page).getByText("f(x)")).toHaveCount(0);

		// CA-03: B with nothing selected turns bold on for what is typed next.
		await page.keyboard.type("Qual destas ");
		await toolbar(page).getByRole("button", { name: "Negrito" }).click();
		await expect(field).toBeFocused();
		await page.keyboard.type("não");
		await toolbar(page).getByRole("button", { name: "Negrito" }).click();
		await page.keyboard.type(" é uma capital?");
		await expect(field.locator("strong")).toHaveText("não");

		// CA-04: bold and italic on a selection, both buttons lit.
		await page.keyboard.press("End");
		await page.keyboard.press("ArrowLeft");
		for (let step = 0; step < "capital".length; step++) {
			await page.keyboard.press("Shift+ArrowLeft");
		}
		await expectSelected(field, "capital");
		await toolbar(page).getByRole("button", { name: "Itálico" }).click();
		await toolbar(page).getByRole("button", { name: "Negrito" }).click();
		await expect(field.locator("strong em, em strong")).toHaveText("capital");
		await expect(
			toolbar(page).getByRole("button", { name: "Itálico" }),
		).toHaveAttribute("aria-pressed", "true");

		// CA-09: the counter counts the text only (160 − 30).
		await expect(page.getByText("130 caracteres restantes")).toBeAttached();

		// CA-02: saved, and still there after a reload.
		await page.getByRole("textbox", { name: "Título do quiz" }).click();
		await expect(toolbar(page)).toHaveCount(0);
		await expectSaved(page);
		await page.reload();
		await expect(statement(page).locator("strong").first()).toHaveText("não");

		// CA-05, CA-06, CA-07: Ctrl+. raises the 2, Ctrl+, lowers it instead.
		await clear(page);
		await page.keyboard.type("H2O");
		await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("Shift+ArrowLeft");
		await expectSelected(statement(page), "2");
		await page.keyboard.press("Control+.");
		await expect(statement(page).locator("sup")).toHaveText("2");
		await page.keyboard.press("Control+,");
		await expect(statement(page).locator("sub")).toHaveText("2");
		await expect(statement(page).locator("sup")).toHaveCount(0);

		// CA-08: undo and redo the formatting.
		await page.keyboard.press("ControlOrMeta+Z");
		await expect(statement(page).locator("sup")).toHaveText("2");
		await page.keyboard.press("ControlOrMeta+Shift+Z");
		await expect(statement(page).locator("sub")).toHaveText("2");

		// CA-10: nothing goes past 160 characters.
		await clear(page);
		await page.keyboard.insertText("a".repeat(160));
		await page.keyboard.type("b");
		await expect(statement(page)).toHaveText("a".repeat(160));
		await expect(page.getByText("0 caracteres restantes")).toBeAttached();

		// CA-11: a paste keeps the four marks, drops the rest, in one line.
		await clear(page);
		await pasteHtml(
			statement(page),
			'<p><b>forte</b> <span style="color: red">vermelho</span> <u>sublinhado</u> <a href="https://exemplo.test">link</a></p><p>x<sup>2</sup></p>',
			"forte vermelho sublinhado link\nx2",
		);
		await expect(statement(page)).toHaveText(
			"forte vermelho sublinhado link x2",
		);
		await expect(statement(page).locator("strong")).toHaveText("forte");
		await expect(statement(page).locator("sup")).toHaveText("2");
		await expect(statement(page).locator("u, a, span[style]")).toHaveCount(0);

		// CA-14, CA-17: π goes in at the cursor through "Insira um símbolo".
		await clear(page);
		await page.keyboard.type("Quanto vale ?");
		await page.keyboard.press("ArrowLeft");
		await toolbar(page).getByRole("button", { name: "Símbolos" }).click();
		const symbols = page.getByRole("dialog", { name: "Insira um símbolo" });
		await symbols.getByRole("tab", { name: "Grego" }).click();
		await expect(
			symbols.getByRole("button", { name: "σ", exact: true }),
		).toBeVisible();
		await expect(
			symbols.getByRole("button", { name: "ς", exact: true }),
		).toBeVisible();
		await symbols.getByRole("tab", { name: "Matemática" }).click();
		await symbols.getByRole("button", { name: "π", exact: true }).click();
		await expect(symbols).toBeHidden();
		await expect(statement(page)).toHaveText("Quanto vale π?");
		await expect(statement(page)).toBeFocused();
		await expectSaved(page);
	});

	test("a tela do anfitrião e o celular mostram o enunciado formatado", async ({
		page: host,
		browser,
		isMobile,
	}) => {
		test.skip(isMobile, "the host's screen is a computer's");
		test.setTimeout(150_000);
		await signUp(host);
		await createQuizInEditor(host);
		await host.getByRole("textbox", { name: "Título do quiz" }).fill("Química");
		await statement(host).click();
		await host.keyboard.type("Qual é a fórmula da água, H2O?");
		await expect(statement(host)).toHaveText("Qual é a fórmula da água, H2O?");
		await host.keyboard.press("ArrowLeft");
		await host.keyboard.press("ArrowLeft");
		await host.keyboard.press("Shift+ArrowLeft");
		await expectSelected(statement(host), "2");
		await host.keyboard.press("Control+,");
		await expect(statement(host).locator("sub")).toHaveText("2");
		for (const [position, text] of ["H2O", "CO2"].entries()) {
			const answer = host.getByRole("textbox", {
				name: `Resposta ${position + 1}`,
				exact: true,
			});
			await answer.fill(text);
			await answer.blur();
		}
		await host.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
		await expectSaved(host);
		await host.getByRole("button", { name: "Salvar", exact: true }).click();
		const ready = host.getByRole("dialog", { name: "O quiz está pronto" });
		await ready.getByRole("button", { name: /Organizar ao vivo/ }).click();

		const pin = await lobbyPin(host);
		await host.getByRole("button", { name: "Configurações" }).click();
		const settings = host.getByRole("dialog", { name: "Configurações" });
		await settings
			.getByRole("switch", { name: "Mostrar perguntas nos dispositivos" })
			.click();
		await settings.getByRole("button", { name: "Fechar" }).click();

		const ana = await newParticipant(browser);
		await ana.emulateMedia({ reducedMotion: "reduce" });
		await ana.goto(`/join/${pin}`);
		await enterNickname(ana, "Ana");
		await expect(
			ana.getByText("Pronto! Está vendo seu apelido na tela?"),
		).toBeVisible();
		await host.getByRole("button", { name: "Iniciar" }).click();

		// CA-21, CA-22: both screens draw the 2 below the line, the rest in normal weight.
		const onHost = host.getByRole("heading", {
			name: "Qual é a fórmula da água, H2O?",
		});
		const onPhone = ana.getByRole("heading", {
			name: "Qual é a fórmula da água, H2O?",
		});
		await expect(onHost.locator("sub")).toHaveText("2", NEXT_PHASE);
		await expect(onPhone.locator("sub")).toHaveText("2", NEXT_PHASE);
		expect(
			await onHost.evaluate((element) => getComputedStyle(element).fontWeight),
		).toBe("400");
	});

	test("no celular, a barra cabe na tela e o diálogo tem menos colunas", async ({
		page,
		isMobile,
	}) => {
		test.skip(!isMobile, "the phone's layout");
		test.setTimeout(90_000);
		await signUp(page);
		await createQuizInEditor(page);

		// CA-28: the bar is whole on the screen above the field.
		await statement(page).click();
		const bar = await toolbar(page).boundingBox();
		const viewport = page.viewportSize();
		expect(bar).not.toBeNull();
		expect(bar?.x ?? -1).toBeGreaterThanOrEqual(0);
		expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(
			viewport?.width ?? 0,
		);

		await toolbar(page).getByRole("button", { name: "Símbolos" }).click();
		const grid = page
			.getByRole("dialog", { name: "Insira um símbolo" })
			.getByRole("group", { name: "Caracteres especiais" });
		const columns = await grid.evaluate(
			(element) =>
				getComputedStyle(element).gridTemplateColumns.split(" ").length,
		);
		expect(columns).toBeLessThan(10);
		expect(
			await grid.evaluate(
				(element) => element.scrollHeight > element.clientHeight,
			),
		).toBe(true);
	});
});
