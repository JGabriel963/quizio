import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveStatus } from "./save-status";

describe("SaveStatus", () => {
	it("shows Salvando… while saving", () => {
		render(<SaveStatus status="saving" onRetry={vi.fn()} />);

		expect(screen.getByRole("status")).toHaveTextContent("Salvando…");
	});

	it("shows Salvo when everything arrived", () => {
		render(<SaveStatus status="saved" onRetry={vi.fn()} />);

		expect(screen.getByRole("status")).toHaveTextContent("Salvo");
	});

	it("shows the failure with Tentar de novo", async () => {
		const onRetry = vi.fn();
		render(<SaveStatus status="failed" onRetry={onRetry} />);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Não foi possível salvar",
		);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
