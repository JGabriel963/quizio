import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "./progress";

describe("Progress", () => {
	it("renders the progress bar with its value", () => {
		render(<Progress value={40} aria-label="Enviando" />);

		const bar = screen.getByRole("progressbar", { name: "Enviando" });
		expect(bar).toHaveAttribute("aria-valuenow", "40");
		expect(bar).toHaveAttribute("data-slot", "progress");
	});
});
