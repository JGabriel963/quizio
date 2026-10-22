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
const control = (page: Page) =>
	page.getByRole("slider", { name: "Sua resposta" });

/** Fills a field of the scale and leaves it, which saves it. */
async function fillField(page: Page, name: string, value: string) {
	const field = page.getByRole("textbox", { name, exact: true });
	await field.fill(value);
	await field.blur();
}

/** A playable quiz with one slider: 100 to 900, 600 "anos", the medium margin. */
async function publishSliderQuiz(page: Page, title: string) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await chooseProperty(page, "Tipo de pergunta", "Controle deslizante");
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Quantos anos tinha Noé quando o dilúvio acabou?");
	// CA-02: the range waits for the answer.
	await expect(
		page.getByRole("textbox", { name: "Mínimo", exact: true }),
	).toBeDisabled();
	await page.getByRole("button", { name: "Adicionar resposta" }).click();
	await fillField(page, "Resposta", "600");
	// CA-03: the first answer brings its range.
	await expect(
		page.getByRole("textbox", { name: "Mínimo", exact: true }),
	).toHaveValue("580");
	await expect(
		page.getByRole("textbox", { name: "Máximo", exact: true }),
	).toHaveValue("630");
	await fillField(page, "Mínimo", "100");
	await fillField(page, "Máximo", "900");
	await page.getByRole("button", { name: "Adicionar unidade" }).click();
	await fillField(page, "Unidade", "anos");
	// CA-04: the margin and the step of 100 to 900.
	await expect(page.getByText("Margem de resposta: 520 a 680")).toBeVisible();
	await expect(page.getByText("Valor da etapa: 8")).toBeVisible();
	await expectSaved(page);

	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

/** Moves the control by `steps` positions with the arrow keys. */
async function slide(page: Page, steps: number) {
	await control(page).focus();
	for (let step = 0; step < steps; step++) {
		await page.keyboard.press("ArrowRight");
	}
}

test.describe("controle deslizante (spec 032)", () => {
	test("creates a slider, plays it live and sees the distribution", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(host);
		await publishSliderQuiz(host, "Anos de Noé");

		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		const ana = await newParticipant(browser);
		const bia = await newParticipant(browser);
		for (const [page, nickname] of [
			[ana, "Ana"],
			[bia, "Bia"],
		] as const) {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto(`/join/${pin}`);
			await enterNickname(page, nickname);
		}
		await expect(host.locator('[data-slot="player-count"]')).toHaveText("2");
		await host.getByRole("button", { name: "Iniciar" }).click();

		// CA-21: the control starts near the middle, at 496.
		await expect(control(ana)).toHaveAttribute(
			"aria-valuenow",
			"496",
			NEXT_PHASE,
		);
		await expect(host.locator('[data-slot="slider-answering"]')).toBeVisible();
		await slide(ana, 13);
		await expect(control(ana)).toHaveAttribute("aria-valuenow", "600");
		await ana.getByRole("button", { name: "Enviar" }).click();
		await expect(control(bia)).toBeVisible();
		await slide(bia, 18);
		await bia.getByRole("button", { name: "Enviar" }).click();

		// CA-24: the distribution opens on the answer; the phones tell the result.
		await expect(
			host.getByRole("button", { name: "600 anos: 1 resposta" }),
		).toHaveAttribute("aria-pressed", "true", NEXT_PHASE);
		await expect(
			ana.getByRole("heading", { name: "Correto", exact: true }),
		).toBeVisible();
		await expect(
			bia.getByRole("heading", { name: "Quase correto", exact: true }),
		).toBeVisible();
		await expect(bia.locator('[data-slot="slider-outcome"]')).toContainText(
			"640 anos",
		);
	});

	test("an assignment shows the slider's result", async ({
		page: creator,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(creator, { name: "Ana" });
		await publishSliderQuiz(creator, "Dilúvio");

		await readyDialog(creator)
			.getByRole("button", { name: /^Atribuir/ })
			.click();
		await creator
			.getByRole("dialog", { name: "Configurar atividade" })
			.getByRole("button", { name: "Criar uma tarefa" })
			.click();
		const share = creator.getByRole("dialog", {
			name: "Compartilhe com os participantes",
		});
		await share.getByRole("link", { name: /Dilúvio/ }).click();
		await expect(
			creator.getByRole("heading", { level: 1, name: "Dilúvio" }),
		).toBeVisible();
		const gameId = creator.url().split("/reports/")[1]?.split("?")[0] ?? "";

		const john = await newParticipant(browser);
		await john.goto(`/assignment/${gameId}`);
		await expect(john.getByText("1 pergunta")).toBeVisible({
			timeout: 15_000,
		});
		await john.getByRole("button", { name: "Iniciar" }).click();
		await john.getByRole("textbox", { name: "Insira um apelido" }).fill("John");
		await john.getByRole("button", { name: "Ok, vamos lá!" }).click();

		// CA-25: the control, then the value sent, the answer and the margin.
		await expect(control(john)).toBeVisible();
		await john.getByRole("button", { name: "Enviar" }).click();
		await expect(
			john.getByRole("heading", { name: "A resposta correta é:" }),
		).toBeVisible();
		await expect(john.getByText("Incorreto", { exact: true })).toBeVisible();
		await expect(john.getByText("600 anos", { exact: true })).toBeVisible();
	});
});
