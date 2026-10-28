import type { BackgroundPatternId } from "@quizio/core/shared/domain/theme-look";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PatternPicker } from "./pattern-picker";

function Harness() {
	const [value, setValue] = useState<BackgroundPatternId>("waves");
	return <PatternPicker value={value} color="#1b2a6b" onChange={setValue} />;
}

describe("PatternPicker (spec 043, RN-05)", () => {
	it("shows the 4 patterns, the chosen one checked", () => {
		render(<Harness />);

		expect(screen.getAllByRole("radio")).toHaveLength(4);
		expect(screen.getByRole("radio", { name: "Ondas" })).toBeChecked();
	});

	it("picks a pattern with the keyboard (CA-25)", async () => {
		render(<Harness />);
		const user = userEvent.setup();

		screen.getByRole("radio", { name: "Ondas" }).focus();
		await user.keyboard("{ArrowRight}");

		expect(screen.getByRole("radio", { name: "Montanhas" })).toBeChecked();
	});
});
