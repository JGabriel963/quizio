import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisibilityBadge } from "./visibility-badge";

describe("VisibilityBadge (spec 039, RN-25)", () => {
	it("shows Privado and Público", () => {
		const { rerender } = render(<VisibilityBadge visibility="private" />);
		expect(screen.getByText("Privado")).toHaveAttribute(
			"data-variant",
			"private",
		);

		rerender(<VisibilityBadge visibility="public" />);
		expect(screen.getByText("Público")).toHaveAttribute(
			"data-variant",
			"public",
		);
	});
});
