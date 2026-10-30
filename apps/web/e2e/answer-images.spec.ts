import { expect, type Page, test } from "@playwright/test";

import {
	chooseProperty,
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	PNG_1PX,
	signUp,
} from "./support";

/** A phase lasts up to 6.5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 20_000 };

const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const answerImage = (page: Page, position: number) =>
	page.getByRole("img", { name: `Imagem da resposta ${position}` });

/** Sends the image through the answer's dialog and waits for it to land. */
async function sendAnswerImage(page: Page, position: number) {
	const dialog = page.getByRole("dialog", { name: "Carregar imagem" });
	await dialog.getByLabel("Carregar mídia").setInputFiles({
		name: "arroz.png",
		mimeType: "image/png",
		buffer: PNG_1PX,
	});
	await expect(dialog).toBeHidden();
	await expect(answerImage(page, position)).toBeVisible();
	await expectSaved(page);
}

test.describe("imagem nas respostas (spec 049)", () => {
	test("a imagem toma o lugar do texto, é recortada, descrita e removida", async ({
		page,
	}) => {
		test.setTimeout(120_000);
		await signUp(page);
		await createQuizInEditor(page);

		// CA-01, CA-03: from the bar of a written answer, the text goes away.
		await answer(page, 1).fill("Arroz");
		await answer(page, 1).click();
		await page
			.getByRole("toolbar", { name: "Formatação da resposta 1" })
			.getByRole("button", {
				name: "Adicione imagem como resposta alternativa",
			})
			.click();
		await sendAnswerImage(page, 1);
		await expect(answer(page, 1)).toHaveCount(0);

		// CA-01: from the icon of an empty answer.
		await page
			.getByRole("button", { name: "Adicionar imagem à resposta 2" })
			.click();
		await sendAnswerImage(page, 2);

		// CA-07: a crop without the circle.
		await answerImage(page, 1).hover({ force: true });
		await page
			.getByRole("button", { name: "Recortar imagem da resposta 1" })
			.click();
		const crop = page.getByRole("dialog", { name: "Recortar imagem" });
		await expect(crop.getByRole("radio", { name: "Círculo" })).toHaveCount(0);
		await crop.getByRole("radio", { name: "Retrato" }).click();
		await crop.getByRole("button", { name: "Salvar" }).click();
		await expect(
			page.locator("[data-slot=answer-image][data-crop=portrait]"),
		).toBeVisible();

		// CA-08: the alt text names the image.
		await page
			.getByRole("button", { name: "Detalhes da mídia da resposta 1" })
			.click();
		const details = page.getByRole("dialog", {
			name: "Adicionar detalhes da mídia",
		});
		await details
			.getByRole("textbox", { name: "Adicionar um texto alternativo" })
			.fill("Arroz de cuxá");
		await details.getByRole("button", { name: "Adicionar" }).click();
		await expectSaved(page);
		await page.reload();
		await expect(
			page.getByRole("img", { name: "Arroz de cuxá" }),
		).toBeVisible();

		// CA-10: removing gives an empty field back.
		await page
			.getByRole("button", { name: "Remover imagem da resposta 2" })
			.click();
		await expect(answer(page, 2)).toHaveText("");
		await expectSaved(page);
		await page.reload();
		await expect(answerImage(page, 2)).toHaveCount(0);
	});

	test("o anfitrião e o celular mostram a resposta em imagem", async ({
		page: host,
		browser,
		isMobile,
	}) => {
		test.skip(isMobile, "the host's screen is a computer's");
		test.setTimeout(150_000);
		await signUp(host);
		await createQuizInEditor(host);
		await host.getByRole("textbox", { name: "Título do quiz" }).fill("Pratos");
		await host
			.getByRole("textbox", { name: "Pergunta" })
			.fill("Qual é o arroz de cuxá?");
		await host
			.getByRole("button", { name: "Adicionar imagem à resposta 1" })
			.click();
		await sendAnswerImage(host, 1);
		await answer(host, 2).fill("Feijão");
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

		// CA-13, CA-14: the image on the host's screen and in the phone's button.
		await expect(answerImage(host, 1)).toBeVisible(NEXT_PHASE);
		const button = ana.getByRole("button", { name: "Imagem da resposta 1" });
		await expect(button).toBeVisible(NEXT_PHASE);
		await expect(button).toHaveAttribute("data-format", "image");

		await button.click();
		await expect(host.getByRole("button", { name: "Avançar" })).toBeVisible(
			NEXT_PHASE,
		);
		await expect(answerImage(host, 1)).toBeVisible();
	});

	test("no Puzzle, a imagem vai com o bloco quando ele se move", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		await signUp(page);
		await createQuizInEditor(page);
		await chooseProperty(page, "Tipo de pergunta", "Puzzle");

		await answer(page, 1).fill("Sal");
		await answer(page, 1).blur();
		await page
			.getByRole("button", { name: "Adicionar imagem à resposta 2" })
			.click();
		await sendAnswerImage(page, 2);

		// CA-10: ↑ on the handle takes the image up.
		await page.getByRole("button", { name: "Mover resposta 2" }).focus();
		await page.keyboard.press("ArrowUp");
		await expect(answerImage(page, 1)).toBeVisible();
		await expect(answer(page, 2)).toHaveText("Sal");
		await expectSaved(page);
		await page.reload();
		await expect(answerImage(page, 1)).toBeVisible();
	});
});
