import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiAccessSection } from "./ai-access-section";

const HOUR = 60 * 60 * 1000;

describe("AiAccessSection (spec 039, RN-17 to RN-19)", () => {
	it("usage bar and next free time", () => {
		render(
			<AiAccessSection
				status={{ enabled: true, used: 3, limit: 20, nextFreeInMs: 5 * HOUR }}
			/>,
		);

		expect(
			screen.getByText("O assistente de criação está disponível."),
		).toBeVisible();
		expect(
			screen.getByText("3 de 20 criações nas últimas 24 horas"),
		).toBeVisible();
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"15",
		);
		expect(
			screen.getByText("A próxima criação volta a ficar livre em 5 horas."),
		).toBeVisible();
	});

	it("used up", () => {
		render(
			<AiAccessSection
				status={{ enabled: true, used: 20, limit: 20, nextFreeInMs: HOUR }}
			/>,
		);

		expect(
			screen.getByText("Você usou todas as criações das últimas 24 horas."),
		).toBeVisible();
	});

	it("not available", () => {
		render(
			<AiAccessSection
				status={{ enabled: false, used: 0, limit: 20, nextFreeInMs: null }}
			/>,
		);

		expect(
			screen.getByText(
				"O assistente de criação não está disponível neste Quizio.",
			),
		).toBeVisible();
		expect(screen.queryByRole("progressbar")).toBeNull();
	});
});
