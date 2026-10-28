import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CodeBlock } from "./code-block";

describe("CodeBlock", () => {
	it("copies its text and says Copiado for a moment", async () => {
		const user = userEvent.setup();
		render(
			<CodeBlock code="claude mcp add --transport http quizio https://quizio.app/mcp" />,
		);

		await user.click(screen.getByRole("button", { name: "Copiar" }));

		expect(await navigator.clipboard.readText()).toBe(
			"claude mcp add --transport http quizio https://quizio.app/mcp",
		);
		expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();
	});

	it("long text wraps inside the block", () => {
		render(<CodeBlock code={"a".repeat(300)} label="Comando" />);

		const code = screen.getByText("a".repeat(300));
		expect(code.className).toContain("break-all");
		expect(code.closest("[data-slot='code-block']")).toHaveAttribute(
			"aria-label",
			"Comando",
		);
	});
});
