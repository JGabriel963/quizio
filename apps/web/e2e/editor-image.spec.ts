import { expect, type Page, test } from "@playwright/test";

import {
	createQuizInEditor,
	expectSaved,
	PNG_1PX,
	quizList,
	signUp,
} from "./support";

const questionText = (page: Page) =>
	page.getByRole("textbox", { name: "Pergunta" });
const titleField = (page: Page) =>
	page.getByRole("textbox", { name: "Título do quiz" });
const answer = (page: Page, position: number) =>
	page.getByRole("textbox", { name: `Resposta ${position}`, exact: true });
const mediaArea = (page: Page) => page.getByRole("region", { name: "Mídia" });
const mediaAction = (page: Page, name: string) =>
	mediaArea(page).getByRole("button", { name, exact: true });
/** The image in the middle of the question, with the shape of its crop. */
const croppedAs = (page: Page, shape: string) =>
	mediaArea(page).locator(`[data-slot=question-image][data-crop=${shape}]`);
const background = (page: Page) =>
	page.locator("[data-slot=question-background]");
const headerStatus = (page: Page, label: string) =>
	page.getByRole("banner").getByText(label, { exact: true });

async function uploadImage(page: Page) {
	await mediaArea(page).getByLabel("Carregar arquivo").setInputFiles({
		name: "ponte.png",
		mimeType: "image/png",
		buffer: PNG_1PX,
	});
	await expect(mediaArea(page).getByRole("img")).toBeVisible();
	await expectSaved(page);
}

test.beforeEach(async ({ page }) => {
	await signUp(page);
	await createQuizInEditor(page);
});

test("envia uma imagem, recorta, descreve e ela continua depois de recarregar", async ({
	page,
}) => {
	await expect(mediaArea(page)).toContainText("Encontre e insira mídia");
	await expect(mediaArea(page)).toContainText(
		"Carregar arquivo ou arraste aqui para fazer upload",
	);

	await uploadImage(page);
	await expect(
		mediaArea(page).getByRole("img", { name: "Imagem da pergunta" }),
	).toBeVisible();
	await expect(croppedAs(page, "none")).toBeVisible();

	await mediaAction(page, "Editar recorte de imagem").click();
	const crop = page.getByRole("dialog", { name: "Recortar imagem" });
	await expect(crop.getByRole("radio", { name: "Paisagem" })).toBeChecked();
	await crop.getByRole("radio", { name: "Quadrado" }).click();
	await crop.getByRole("button", { name: "Salvar" }).click();
	await expect(crop).toBeHidden();
	await expect(croppedAs(page, "square")).toBeVisible();

	await mediaAction(page, "Detalhes da mídia").click();
	const details = page.getByRole("dialog", {
		name: "Adicionar detalhes da mídia",
	});
	await details
		.getByRole("textbox", { name: "Adicionar um texto alternativo" })
		.fill("Ponte ao pôr do sol");
	await details.getByRole("button", { name: "Adicionar" }).click();
	await expect(details).toBeHidden();
	await expectSaved(page);

	await page.reload();
	await expect(
		mediaArea(page).getByRole("img", { name: "Ponte ao pôr do sol" }),
	).toBeVisible();
	await expect(croppedAs(page, "square")).toBeVisible();

	// Reopening the crop starts from the original image, which undoes it (RN-21).
	await mediaAction(page, "Editar recorte de imagem").click();
	await expect(crop.getByRole("radio", { name: "Paisagem" })).toBeChecked();
	await crop.getByRole("button", { name: "Salvar" }).click();
	await expect(croppedAs(page, "landscape")).toBeVisible();

	await mediaAction(page, "Remover imagem").click();
	await expect(mediaArea(page)).toContainText("Encontre e insira mídia");
	await expectSaved(page);
});

test("recusa um arquivo que não é imagem aceita", async ({ page }) => {
	await mediaArea(page)
		.getByLabel("Carregar arquivo")
		.setInputFiles({
			name: "documento.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("%PDF-1.4"),
		});

	await expect(mediaArea(page).getByRole("alert")).toHaveText(
		"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
	);
	await expect(mediaArea(page).getByRole("img")).toHaveCount(0);
});

test("usa a imagem como fundo, com o aviso só até ser dispensado, e volta ao centro", async ({
	page,
}) => {
	await uploadImage(page);

	await mediaAction(page, "Usar como fundo").click();
	const notice = page.getByRole("dialog", {
		name: "Partes do fundo não ficarão visíveis durante o jogo",
	});
	await expect(notice).toBeVisible();
	await notice
		.getByRole("checkbox", { name: "Não mostrar essa mensagem novamente" })
		.click();
	await notice.getByRole("button", { name: "Ok" }).click();
	await expect(notice).toBeHidden();
	await expect(background(page)).toBeVisible();
	await expect(mediaArea(page).getByRole("img")).toHaveCount(0);
	await expect(mediaAction(page, "Editar recorte de imagem")).toHaveCount(0);
	await expectSaved(page);

	await page.reload();
	await expect(background(page)).toBeVisible();

	await mediaAction(page, "Usar como mídia").click();
	await expect(background(page)).toHaveCount(0);
	await expect(mediaArea(page).getByRole("img")).toBeVisible();

	await mediaAction(page, "Usar como fundo").click();
	await expect(background(page)).toBeVisible();
	await expect(notice).toBeHidden();
});

test("imagem de quiz publicado é alteração não salva, e Descartar a traz de volta", async ({
	page,
}) => {
	await titleField(page).fill("Pontes do mundo");
	await titleField(page).blur();
	await questionText(page).fill("Que ponte é esta?");
	await answer(page, 1).fill("Golden Gate");
	await answer(page, 2).fill("Rio-Niterói");
	await answer(page, 2).blur();
	await page.getByRole("checkbox", { name: "Resposta 1 correta" }).click();
	await uploadImage(page);

	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	const ready = page.getByRole("dialog", { name: "O quiz está pronto" });
	await ready.getByRole("button", { name: "Voltar para edição" }).click();
	await expect(headerStatus(page, "Publicado")).toBeAttached();

	await mediaAction(page, "Remover imagem").click();
	await expect(headerStatus(page, "Alterações não salvas")).toBeAttached();
	await expectSaved(page);

	await page.getByRole("button", { name: "Sair", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Algumas alterações não foram salvas" })
		.getByRole("button", { name: "Descartar" })
		.click();
	await expect(page).toHaveURL(/\/library/);

	await quizList(page).getByRole("link", { name: "Pontes do mundo" }).click();
	await page.getByRole("link", { name: "Editar", exact: true }).click();
	await expect(mediaArea(page).getByRole("img")).toBeVisible();
	await expect(headerStatus(page, "Publicado")).toBeAttached();
});
