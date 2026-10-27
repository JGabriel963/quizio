import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
	it.each([
		["private", "Privado"],
		["public", "Público"],
	] as const)("renders the %s visibility variant", (variant, label) => {
		render(<Badge variant={variant}>{label}</Badge>);

		const badge = screen.getByText(label);
		expect(badge).toHaveAttribute("data-slot", "badge");
		expect(badge).toHaveAttribute("data-variant", variant);
	});

	it.each([
		["draft", "Rascunho"],
		["published", "Publicado"],
		["unsaved", "Alterações não salvas"],
	] as const)("renders the quiz status variants: %s", (variant, label) => {
		render(<Badge variant={variant}>{label}</Badge>);

		const badge = screen.getByText(label);
		expect(badge).toHaveAttribute("data-slot", "badge");
		expect(badge).toHaveAttribute("data-variant", variant);
	});

	it("renders the soon variant for not yet available entry points", () => {
		render(<Badge variant="soon">Em breve</Badge>);

		const badge = screen.getByText("Em breve");
		expect(badge).toHaveAttribute("data-slot", "badge");
		expect(badge).toHaveAttribute("data-variant", "soon");
		// The dashed outline is what tells "planned" apart from the solid
		// "private" badge, so the class is the contract here.
		expect(badge.className).toContain("border-dashed");
	});

	it("renders the role variant for a group's admin (spec 034)", () => {
		render(<Badge variant="role">Administrador</Badge>);

		const badge = screen.getByText("Administrador");
		expect(badge).toHaveAttribute("data-slot", "badge");
		expect(badge).toHaveAttribute("data-variant", "role");
		// Quiet, so the name beside it stays the row's main text.
		expect(badge.className).toContain("bg-muted");
		expect(badge.className).not.toContain("bg-primary");
	});
});
