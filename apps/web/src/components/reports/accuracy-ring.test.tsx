import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccuracyRing } from "./accuracy-ring";

const ring = (container: HTMLElement) =>
	container.querySelector('[data-slot="accuracy-ring"]');

describe("AccuracyRing (spec 015)", () => {
	it("shows the number beside the ring", () => {
		render(<AccuracyRing percent={38} />);

		expect(screen.getByText("38%")).toBeInTheDocument();
	});

	it("shows a dash without a percent", () => {
		const { container } = render(<AccuracyRing percent={null} />);

		expect(screen.getByText("—")).toBeInTheDocument();
		// Nothing is drawn as right or wrong.
		expect(ring(container)?.querySelectorAll("circle")).toHaveLength(1);
	});

	it("the drawing is hidden from screen readers", () => {
		const { container } = render(<AccuracyRing percent={38} />);

		expect(ring(container)).toHaveAttribute("aria-hidden", "true");
	});

	it("the large ring has the number inside, with its caption", () => {
		render(<AccuracyRing percent={38} size="lg" caption="correto" />);

		expect(screen.getByText("38%")).toBeInTheDocument();
		expect(screen.getByText("correto")).toBeInTheDocument();
	});
});
