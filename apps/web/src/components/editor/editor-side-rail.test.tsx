import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EditorSideRail } from "./editor-side-rail";

describe("EditorSideRail (spec 042, RN-22)", () => {
	it("Propriedades starts pressed", () => {
		render(<EditorSideRail open="properties" onOpen={vi.fn()} />);

		expect(
			screen.getByRole("button", { name: "Propriedades" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Temas" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});

	it("switching to Temas asks for it, and pressing the open one closes it", async () => {
		const onOpen = vi.fn();
		const { rerender } = render(
			<EditorSideRail open="properties" onOpen={onOpen} />,
		);

		await userEvent.click(screen.getByRole("button", { name: "Temas" }));
		expect(onOpen).toHaveBeenLastCalledWith("themes");

		rerender(<EditorSideRail open="themes" onOpen={onOpen} />);
		await userEvent.click(screen.getByRole("button", { name: "Temas" }));
		expect(onOpen).toHaveBeenLastCalledWith(null);
	});
});
