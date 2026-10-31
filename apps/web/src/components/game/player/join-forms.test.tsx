import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NicknameForm } from "./join-forms";

describe("NicknameForm", () => {
	it("says that joining accepts the Terms and the Privacy Policy", () => {
		render(<NicknameForm error={null} busy={false} onSubmit={vi.fn()} />);

		expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute(
			"href",
			"/terms",
		);
		expect(
			screen.getByRole("link", { name: "Política de Privacidade" }),
		).toHaveAttribute("href", "/privacy");
	});
});
