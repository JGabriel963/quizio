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
});
