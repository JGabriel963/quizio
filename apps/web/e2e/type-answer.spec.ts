import { expect, type Page, test } from "@playwright/test";

import {
	chooseProperty,
	createQuizInEditor,
	enterNickname,
	expectSaved,
	lobbyPin,
	newParticipant,
	pickNewQuestionType,
	signUp,
} from "./support";

/** A phase lasts up to 6.5 s before the host's screen asks for the next one. */
const NEXT_PHASE = { timeout: 20_000 };

const readyDialog = (page: Page) =>
	page.getByRole("dialog", { name: "O quiz está pronto" });
const answerField = (page: Page) =>
	page.getByRole("textbox", { name: "Sua resposta" });

/**
 * A playable quiz whose first question is a type answer, "Pedro" accepted,
 * and, with `withSecond`, a true/false one after it.
 */
async function publishTypeAnswerQuiz(
	page: Page,
	title: string,
	withSecond: boolean,
) {
	await createQuizInEditor(page);
	await page.getByRole("textbox", { name: "Título do quiz" }).fill(title);
	await chooseProperty(page, "Tipo de pergunta", "Resposta curta");
	await page
		.getByRole("textbox", { name: "Pergunta" })
		.fill("Quem andou sobre as águas?");
	const accepted = page.getByRole("textbox", { name: "Resposta aceita" });
	await accepted.fill("Pedro");
	await accepted.blur();
	await expectSaved(page);

	if (withSecond) {
		await pickNewQuestionType(page, "Verdadeiro ou falso");
		const question = page.getByRole("textbox", { name: "Pergunta" });
		await expect(question).toHaveText("");
		await question.fill("Pedro era pescador");
		await question.blur();
		await page.getByRole("checkbox", { name: "Verdadeiro correta" }).click();
		await expectSaved(page);
	}

	await page.getByRole("button", { name: "Salvar", exact: true }).click();
	await expect(readyDialog(page)).toBeVisible();
}

test.describe("resposta curta (spec 031)", () => {
	test("the host accepts a similar typed answer and the scoreboard counts it", async ({
		page: host,
		browser,
	}) => {
		test.setTimeout(150_000);
		await signUp(host);
		await publishTypeAnswerQuiz(host, "Apóstolos", true);

		await readyDialog(host)
			.getByRole("button", { name: /Organizar ao vivo/ })
			.click();
		const pin = await lobbyPin(host);
		const ana = await newParticipant(browser);
		const bia = await newParticipant(browser);
		await ana.emulateMedia({ reducedMotion: "reduce" });
		await bia.emulateMedia({ reducedMotion: "reduce" });
		for (const [page, nickname] of [
			[ana, "Ana"],
			[bia, "Bia"],
		] as const) {
			await page.goto(`/join/${pin}`);
			await enterNickname(page, nickname);
		}
		await expect(host.locator('[data-slot="player-count"]')).toHaveText("2");
		await host.getByRole("button", { name: "Iniciar" }).click();

		// CA-18: the host has no answers to show, the phones a field (CA-15).
		await expect(host.getByText("Jogadores, digitem a resposta!")).toBeVisible(
			NEXT_PHASE,
		);
		await expect(answerField(ana)).toBeVisible();
		await answerField(ana).fill("pedro");
		await ana.getByRole("button", { name: "Enviar" }).click();
		await answerField(bia).fill("Pedra");
		await bia.getByRole("button", { name: "Enviar" }).click();

		// CA-19: everybody answered, so the results come with the correct answers.
		await expect(
			host.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeVisible(NEXT_PHASE);
		await expect(
			ana.getByRole("heading", { name: "Correto", exact: true }),
		).toBeVisible();
		await expect(
			bia.getByRole("heading", { name: "Incorreto", exact: true }),
		).toBeVisible();

		// CA-21, CA-22: the review lists "Pedra" as similar; accepting it moves on.
		await host.getByRole("button", { name: "Revisar respostas" }).click();
		const similar = host.getByRole("list", {
			name: "Parecidas com as respostas corretas",
		});
		await similar.getByRole("button", { name: /Pedra/ }).click();
		await host.getByRole("button", { name: "Enviar" }).click();

		const scoreboard = host
			.getByRole("list", { name: "Placar" })
			.getByRole("listitem");
		await expect(scoreboard).toHaveCount(2, NEXT_PHASE);
		await expect(scoreboard.filter({ hasText: "Bia" })).not.toContainText(
			/\b0\b/,
		);
		await expect(
			bia.getByRole("heading", {
				name: "Sua resposta foi marcada como correta",
			}),
		).toBeVisible(NEXT_PHASE);
	});

	test("a participant answers a type answer in an assignment", async ({
		page: creator,
		browser,
	}) => {
		test.setTimeout(120_000);
		await signUp(creator, { name: "Ana" });
		await publishTypeAnswerQuiz(creator, "Pescadores", false);

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
		await share.getByRole("link", { name: /Pescadores/ }).click();
		await expect(
			creator.getByRole("heading", { level: 1, name: "Pescadores" }),
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

		// CA-30: the field, then the typed text and the accepted answers.
		await answerField(john).fill("simao pedro");
		await john.getByRole("button", { name: "Enviar" }).click();
		await expect(
			john.getByRole("heading", { name: "As respostas corretas são:" }),
		).toBeVisible();
		await expect(john.getByText("Incorreto", { exact: true })).toBeVisible();
		await expect(john.getByText("Pedro", { exact: true })).toBeVisible();
	});
});
