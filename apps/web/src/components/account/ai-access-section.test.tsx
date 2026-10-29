import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AiAccessSection } from "./ai-access-section";

const HOUR = 60 * 60 * 1000;

/** The section has a link, so it renders inside a router, which is async. */
async function show(status: Parameters<typeof AiAccessSection>[0]["status"]) {
	const view = renderWithRouter(<AiAccessSection status={status} />);
	await screen.findByRole("link", { name: "Agentes de IA" });
	return view;
}

describe("AiAccessSection (spec 039, RN-17 to RN-19; spec 045, RN-17)", () => {
	it("tells the credits used of the budget in the last 24 hours", async () => {
		await show({ enabled: true, used: 3, limit: 20, nextFreeInMs: 5 * HOUR });

		expect(
			screen.getByText("O assistente de criação está disponível."),
		).toBeVisible();
		expect(
			screen.getByText("3 de 20 créditos nas últimas 24 horas"),
		).toBeVisible();
		expect(
			screen.getByRole("progressbar", { name: "Créditos usados" }),
		).toHaveAttribute("aria-valuenow", "15");
	});

	it("tells when the next credits come back", async () => {
		await show({ enabled: true, used: 3, limit: 20, nextFreeInMs: 5 * HOUR });

		expect(
			screen.getByText("Os próximos créditos voltam em 5 horas."),
		).toBeVisible();
	});

	it("says the budget is used up", async () => {
		await show({ enabled: true, used: 20, limit: 20, nextFreeInMs: HOUR });

		expect(
			screen.getByText("Você usou todos os créditos das últimas 24 horas."),
		).toBeVisible();
	});

	it("never mentions the instance's ceiling (spec 045, RN-14)", async () => {
		await show({ enabled: true, used: 20, limit: 20, nextFreeInMs: HOUR });

		expect(screen.queryByText(/instância/)).toBeNull();
	});

	it("not available", async () => {
		await show({ enabled: false, used: 0, limit: 20, nextFreeInMs: null });

		expect(
			screen.getByText(
				"O assistente de criação não está disponível neste Quizio.",
			),
		).toBeVisible();
		expect(screen.queryByRole("progressbar")).toBeNull();
	});

	it("points to Agentes de IA, with the assistant or without it (spec 044)", async () => {
		for (const enabled of [true, false]) {
			const { unmount } = await show({
				enabled,
				used: 0,
				limit: 20,
				nextFreeInMs: null,
			});

			expect(
				screen.getByText(/Prefere usar seu próprio agente de IA\?/),
			).toBeVisible();
			expect(
				screen.getByRole("link", { name: "Agentes de IA" }),
			).toHaveAttribute("href", "/settings?section=agents");
			unmount();
		}
	});
});
