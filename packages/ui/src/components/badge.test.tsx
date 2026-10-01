import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
	it.each([
		["private", "Privado"],
		["unlisted", "Não listado"],
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
});
