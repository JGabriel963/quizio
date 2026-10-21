import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { AssignmentLanding } from "./assignment-landing";

describe("AssignmentLanding (spec 029, RN-46, RN-47)", () => {
	it("an ended activity says Esta atividade foi encerrada with the way to the PIN", async () => {
		renderWithRouter(
			<AssignmentLanding state={{ kind: "ended", name: "Capitais" }} />,
		);

		expect(
			await screen.findByRole("heading", {
				name: "Esta atividade foi encerrada",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Capitais")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Entrar com um PIN" }),
		).toHaveAttribute("href", "/join");
	});

	it("a missing activity says so, with the way to the PIN", async () => {
		renderWithRouter(<AssignmentLanding state={{ kind: "missing" }} />);

		expect(
			await screen.findByRole("heading", { name: "Atividade não encontrada" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Entrar com um PIN" }),
		).toHaveAttribute("href", "/join");
	});

	it("a failure to load offers Tentar novamente", async () => {
		const onRetry = vi.fn();
		renderWithRouter(<AssignmentLanding state={{ kind: "error", onRetry }} />);

		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Tentar novamente" }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
