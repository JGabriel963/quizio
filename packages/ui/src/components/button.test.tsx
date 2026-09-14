import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
	it("defaults to the primary pressable variant", () => {
		render(<Button>Crie</Button>);

		const button = screen.getByRole("button", { name: "Crie" });
		expect(button).toHaveAttribute("data-slot", "button");
		expect(button).toHaveAttribute("data-variant", "default");
		expect(button).toHaveClass("bg-primary", "shadow-press");
	});

	it("applies Kahoot-specific variants and sizes", () => {
		render(
			<Button variant="brand" size="xl">
				Iniciar
			</Button>,
		);

		expect(screen.getByRole("button", { name: "Iniciar" })).toHaveClass(
			"bg-brand",
			"h-14",
		);
	});

	it("keeps flat variants free of the pressable edge", () => {
		render(<Button variant="ghost">Cancelar</Button>);

		expect(screen.getByRole("button", { name: "Cancelar" })).not.toHaveClass(
			"shadow-press",
		);
	});

	it("does not fire clicks while disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Enviar
			</Button>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

		expect(onClick).not.toHaveBeenCalled();
	});
});
