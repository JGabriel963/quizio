import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/testing/reduced-motion";

import { CountUp } from "./count-up";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("CountUp (spec 011)", () => {
	it("ends at the target value", async () => {
		render(<CountUp data-testid="points" from={639} value={1340} />);

		await waitFor(() =>
			expect(screen.getByTestId("points")).toHaveTextContent(/^1340$/),
		);
	});

	it("holds where it starts from until told to start", async () => {
		const { rerender } = render(
			<CountUp data-testid="points" from={639} value={1340} start={false} />,
		);
		expect(screen.getByTestId("points")).toHaveTextContent(/^639$/);

		rerender(<CountUp data-testid="points" from={639} value={1340} />);

		await waitFor(() =>
			expect(screen.getByTestId("points")).toHaveTextContent(/^1340$/),
		);
	});

	it("just shows a number that has nowhere to start from", () => {
		render(<CountUp data-testid="points" value={875} />);

		expect(screen.getByTestId("points")).toHaveTextContent(/^875$/);
	});

	it("counts on from what it was showing when the value changes", async () => {
		const { rerender } = render(<CountUp data-testid="points" value={639} />);

		rerender(<CountUp data-testid="points" value={1340} />);

		await waitFor(() =>
			expect(screen.getByTestId("points")).toHaveTextContent(/^1340$/),
		);
	});

	it("shows the target at once with reduced motion", () => {
		stubReducedMotion(true);

		render(<CountUp data-testid="points" from={0} value={701} />);

		expect(screen.getByTestId("points")).toHaveTextContent(/^701$/);
	});
});
