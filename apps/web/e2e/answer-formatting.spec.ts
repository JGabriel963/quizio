import { expect, type Locator, type Page, test } from "@playwright/test";

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

const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const toolbar = (page: Page, position: number) =>
	page.getByRole("toolbar", { name: `Formatação da resposta ${position}` });

/** Pastes what a document gives the clipboard: its HTML and its plain text. */
async function paste(field: Locator, plain: string, html?: string) {
	await field.evaluate(
		(element, data) => {
			const transfer = new DataTransfer();
			if (data.html) {
				transfer.setData("text/html", data.html);
			}
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

/** Selects the last `count` characters of the field, from its end. */
async function selectLast(
	page: Page,
	field: Locator,
	count: number,
	text: string,
) {
	await field.click();
	await page.keyboard.press("End");
	for (let step = 0; step < count; step++) {
		await page.keyboard.press("Shift+ArrowLeft");
	}
	await expectSelected(field, text);
}

async function clear(page: Page, field: Locator) {
	await field.click();
	await page.keyboard.press("ControlOrMeta+A");
	await page.keyboard.press("Backspace");
}

/** Where the bar is: above the field's block, or below it. */
async function barSide(
	page: Page,
	position: number,
): Promise<"above" | "below"> {
	const bar = await toolbar(page, position).boundingBox();
	const block = await answer(page, position).boundingBox();
	if (!bar || !block) {
		throw new Error("The bar or the answer is not on the screen");
	}
	return bar.y + bar.height <= block.y ? "above" : "below";
}

test.describe("formatação das respostas (spec 048)", () => {
	test("barra, marcas, atalhos, desfazer por resposta, limite, colar e símbolos nas respostas", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the keyboard shortcuts are a computer's");
		test.setTimeout(150_000);
		await signUp(page);
		await createQuizInEditor(page);

		// CA-01: the bar goes with the focused answer, above the first row and below the others.
		const answerBars = page.getByRole("toolbar", {
			name: /Formatação da resposta/,
		});
		await expect(answerBars).toHaveCount(0);
		await answer(page, 2).click();
		await expect(toolbar(page, 2)).toBeVisible();
		await expect(toolbar(page, 2).getByText("f(x)")).toHaveCount(0);
		// Spec 049: the bar of an answer starts with the image.
		await expect(
			toolbar(page, 2).getByRole("button", { name: /imagem/i }),
		).toHaveCount(1);
		expect(await barSide(page, 2)).toBe("above");
		await answer(page, 3).click();
		await expect(toolbar(page, 3)).toBeVisible();
		await expect(answerBars).toHaveCount(1);
		expect(await barSide(page, 3)).toBe("below");

		// CA-02: bold on a stretch of an answer, kept after a reload.
		await answer(page, 1).click();
		await page.keyboard.type("Capital do Brasil");
		await selectLast(page, answer(page, 1), 6, "Brasil");
		await toolbar(page, 1).getByRole("button", { name: "Negrito" }).click();
		await expect(answer(page, 1).locator("strong")).toHaveText("Brasil");

		// CA-03: subscript, then superscript instead, by the shortcut.
		await answer(page, 2).click();
		await page.keyboard.type("H2O");
		await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("Shift+ArrowLeft");
		await expectSelected(answer(page, 2), "2");
		await page.keyboard.press("Control+,");
		await expect(answer(page, 2).locator("sub")).toHaveText("2");
		await page.keyboard.press("Control+.");
		await expect(answer(page, 2).locator("sup")).toHaveText("2");
		await expect(answer(page, 2).locator("sub")).toHaveCount(0);

		// CA-04: each answer undoes its own changes.
		await answer(page, 3).click();
		await page.keyboard.type("água");
		await page.keyboard.press("ControlOrMeta+A");
		await expectSelected(answer(page, 3), "água");
		await page.keyboard.press("ControlOrMeta+B");
		await answer(page, 4).click();
		await page.keyboard.type("gelo");
		await page.keyboard.press("ControlOrMeta+A");
		await expectSelected(answer(page, 4), "gelo");
		await page.keyboard.press("ControlOrMeta+I");
		await expect(answer(page, 4).locator("em")).toHaveText("gelo");
		await page.keyboard.press("ControlOrMeta+Z");
		await expect(answer(page, 4).locator("em")).toHaveCount(0);
		await expect(answer(page, 3).locator("strong")).toHaveText("água");

		await page.getByRole("textbox", { name: "Título do quiz" }).click();
		await expectSaved(page);
		await page.reload();
		await expect(answer(page, 1).locator("strong")).toHaveText("Brasil");
		await expect(answer(page, 2).locator("sup")).toHaveText("2");

		// CA-06: a paste stops at 75 characters, and the counter at 0.
		await clear(page, answer(page, 4));
		await paste(answer(page, 4), "a".repeat(90));
		await expect(answer(page, 4)).toHaveText("a".repeat(75));
		await expect(page.getByText("0 caracteres restantes")).toBeAttached();

		// CA-07: a formatted paste keeps the four marks, in one line.
		await clear(page, answer(page, 4));
		await paste(
			answer(page, 4),
			"CO2 vermelho sublinhado\nlinha",
			'<p>CO<sub>2</sub> <span style="color: red">vermelho</span> <u>sublinhado</u></p><p>linha</p>',
		);
		await expect(answer(page, 4)).toHaveText("CO2 vermelho sublinhado linha");
		await expect(answer(page, 4).locator("sub")).toHaveText("2");
		await expect(answer(page, 4).locator("u, span[style]")).toHaveCount(0);

		// CA-08: a symbol goes into the answer that had the focus.
		await clear(page, answer(page, 3));
		await page.keyboard.type("C = 2 × r");
		for (let step = 0; step < 4; step++) {
			await page.keyboard.press("ArrowLeft");
		}
		await toolbar(page, 3).getByRole("button", { name: "Símbolos" }).click();
		const symbols = page.getByRole("dialog", { name: "Insira um símbolo" });
		await symbols.getByRole("tab", { name: "Matemática" }).click();
		await symbols.getByRole("button", { name: "π", exact: true }).click();
		await expect(symbols).toBeHidden();
		await expect(answer(page, 3)).toHaveText("C = 2π × r");
		await expect(answer(page, 3)).toBeFocused();
		await expect(answer(page, 1).locator("strong")).toHaveText("Brasil");
		await expectSaved(page);
	});

	test("no Puzzle, a formatação vai com o texto e a barra fica acima só da primeira", async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "the keyboard shortcuts are a computer's");
		test.setTimeout(120_000);
		await signUp(page);
		await createQuizInEditor(page);
		await chooseProperty(page, "Tipo de pergunta", "Puzzle");

		for (const [index, text] of ["Sal", "H2O", "Ar"].entries()) {
			const field = answer(page, index + 1);
			await field.fill(text);
		}
		await answer(page, 2).click();
		await page.keyboard.press("End");
		await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("Shift+ArrowLeft");
		await expectSelected(answer(page, 2), "2");
		await page.keyboard.press("Control+,");
		await expect(answer(page, 2).locator("sub")).toHaveText("2");

		// CA-10: the bar goes above the first answer only.
		expect(await barSide(page, 2)).toBe("below");
		await answer(page, 1).click();
		expect(await barSide(page, 1)).toBe("above");

		// CA-10: ↑ on the handle takes the text and its formatting up.
		await page.getByRole("button", { name: "Mover H2O" }).focus();
		await page.keyboard.press("ArrowUp");
		await expect(answer(page, 1)).toHaveText("H2O");
		await expect(answer(page, 1).locator("sub")).toHaveText("2");
		await expect(answer(page, 2)).toHaveText("Sal");
		await expectSaved(page);
		await page.reload();
		await expect(answer(page, 1).locator("sub")).toHaveText("2");
		await expect(answer(page, 2)).toHaveText("Sal");
	});

	test("o anfitrião e o celular mostram as respostas formatadas", async ({
		page: host,
		browser,
		isMobile,
	}) => {
		test.skip(isMobile, "the host's screen is a computer's");
		test.setTimeout(150_000);
		await signUp(host);
		await createQuizInEditor(host);
		await host
			.getByRole("textbox", { name: "Título do quiz" })
			.fill("Potências");
		await host
			.getByRole("textbox", { name: "Pergunta" })
			.fill("Qual é o quadrado de x?");
		await answer(host, 1).fill("x2");
		await answer(host, 1).click();
		await host.keyboard.press("End");
		await host.keyboard.press("Shift+ArrowLeft");
		await expectSelected(answer(host, 1), "2");
		await host.keyboard.press("Control+.");
		await answer(host, 2).fill("2x");
		await answer(host, 2).blur();
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

		// CA-14, CA-15: the 2 above the line on both screens, in normal weight.
		const onHost = host.locator("sup").filter({ hasText: "2" });
		const onPhone = ana.locator("sup").filter({ hasText: "2" });
		await expect(onHost).toBeVisible(NEXT_PHASE);
		await expect(onPhone).toBeVisible(NEXT_PHASE);
		expect(
			await onHost.evaluate(
				(element) =>
					getComputedStyle(element.parentElement as Element).fontWeight,
			),
		).toBe("400");

		// The results keep it.
		await ana.getByRole("button", { name: /x2/ }).click();
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible(
			NEXT_PHASE,
		);
		await expect(host.locator("sup").filter({ hasText: "2" })).toBeVisible();
	});

	test("no celular, a barra cabe na tela, acima da resposta 1 e abaixo da 2", async ({
		page,
		isMobile,
	}) => {
		test.skip(!isMobile, "the phone's layout");
		test.setTimeout(90_000);
		await signUp(page);
		await createQuizInEditor(page);

		// CA-22: one column, so the second answer is in the second row.
		await answer(page, 1).click();
		expect(await barSide(page, 1)).toBe("above");
		await answer(page, 2).click();
		expect(await barSide(page, 2)).toBe("below");
		const bar = await toolbar(page, 2).boundingBox();
		const viewport = page.viewportSize();
		expect(bar?.x ?? -1).toBeGreaterThanOrEqual(0);
		expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(
			viewport?.width ?? 0,
		);

		await toolbar(page, 2).getByRole("button", { name: "Símbolos" }).click();
		const symbols = page.getByRole("dialog", { name: "Insira um símbolo" });
		await symbols.getByRole("tab", { name: "Matemática" }).click();
		await symbols.getByRole("button", { name: "π", exact: true }).click();
		await expect(answer(page, 2)).toHaveText("π");
	});
});
