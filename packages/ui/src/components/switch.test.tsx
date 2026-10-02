import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
	it("turns on and off", async () => {
		const onCheckedChange = vi.fn();
		render(
			<Switch aria-label="Bloquear jogo" onCheckedChange={onCheckedChange} />,
		);
		const control = screen.getByRole("switch", { name: "Bloquear jogo" });

		await userEvent.click(control);
		await userEvent.click(control);

		expect(onCheckedChange.mock.calls.map(([checked]) => checked)).toEqual([
			true,
			false,
		]);
	});

	it("tells its state to assistive technology", () => {
		const { rerender } = render(
			<Switch aria-label="Bloquear jogo" checked={false} />,
		);
		const control = screen.getByRole("switch");

		expect(control).toHaveAttribute("aria-checked", "false");
		expect(control).toHaveAttribute("data-slot", "switch");

		rerender(<Switch aria-label="Bloquear jogo" checked />);

		expect(control).toHaveAttribute("aria-checked", "true");
	});

	it("does nothing when disabled", async () => {
		const onCheckedChange = vi.fn();
		render(
			<Switch
				aria-label="Bloquear jogo"
				disabled
				onCheckedChange={onCheckedChange}
			/>,
		);

		await userEvent.click(screen.getByRole("switch"));

		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("answers to the keyboard", async () => {
		const onCheckedChange = vi.fn();
		render(
			<Switch aria-label="Bloquear jogo" onCheckedChange={onCheckedChange} />,
		);

		await userEvent.tab();
		await userEvent.keyboard(" ");

		expect(screen.getByRole("switch")).toHaveFocus();
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
	});
});
