import { expect, test } from "@playwright/test";

import {
	newParticipant,
	openQuizActions,
	publishedQuiz,
	signUp,
} from "./support";

test.describe("perfil público (spec 039)", () => {
	test("a visitante abre um quiz público pelo perfil, organiza ao vivo e duplica uma cópia privada", async ({
		page: ana,
		browser,
	}) => {
		const { name } = await signUp(ana, { name: "Ana Perfil" });
		await publishedQuiz(ana, "Capitais", "Brasília");

		// Público pelo menu da linha, sem abrir as configurações (CA-19a).
		await ana.goto("/library");
		await openQuizActions(ana, "Capitais");
		await ana.getByRole("menuitem", { name: "Visibilidade" }).click();
		await ana.getByRole("menuitemradio", { name: /Público/ }).click();
		await expect(
			ana.getByRole("listitem").filter({ hasText: "Capitais" }),
		).toContainText("Público");

		await ana.goto("/settings?section=profile");
		const profileHref = await ana
			.getByText("Ver perfil")
			.locator("xpath=ancestor-or-self::a[1]")
			.getAttribute("href");
		expect(profileHref).toMatch(/^\/profile\//);

		const bia = await newParticipant(browser);
		await signUp(bia, { name: "Bia Visitante" });
		await bia.goto(profileHref ?? "");
		await expect(bia.getByRole("heading", { level: 1, name })).toBeVisible();
		const totals = bia.getByRole("list", { name: "Números do perfil" });
		await expect(totals).toContainText("Quizzes1");
		await bia.getByRole("link", { name: /Capitais/ }).click();

		await expect(
			bia.getByRole("heading", { level: 1, name: "Capitais" }),
		).toBeVisible();
		await expect(bia.getByText("Voltar ao perfil")).toBeVisible();
		const pageUrl = bia.url();

		await bia.getByRole("button", { name: "Organizar ao vivo" }).click();
		await expect(bia).toHaveURL(/\/host\//);

		await bia.goto(pageUrl);
		await bia.getByRole("button", { name: "Duplicar" }).click();
		await expect(bia).toHaveURL(/\/creator\//);
		await expect(
			bia.getByRole("textbox", { name: "Título do quiz" }),
		).toHaveValue("Capitais (cópia)");

		// The copy is the visitor's, and private (RN-26).
		await bia.goto("/library");
		await expect(
			bia.getByRole("listitem").filter({ hasText: "Capitais (cópia)" }),
		).toContainText("Privado");
	});
});
