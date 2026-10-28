import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./color-picker";

function renderPicker(value = "#253e81") {
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	render(
		<ColorPicker value={value} onConfirm={onConfirm} onCancel={onCancel} />,
	);
	return { onConfirm, onCancel, user: userEvent.setup() };
}

describe("ColorPicker", () => {
	it("starts on the given color, with its code", () => {
		renderPicker();

		expect(screen.getByRole("textbox", { name: "Hex" })).toHaveValue("253e81");
		expect(
			screen.getByRole("slider", { name: "Saturação e brilho" }),
		).toHaveAttribute("aria-valuetext", "#253e81");
	});

	it("a typed code and Ok confirm the color", async () => {
		const { onConfirm, user } = renderPicker();
		const hex = screen.getByRole("textbox", { name: "Hex" });

		await user.clear(hex);
		await user.type(hex, "fff");
		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onConfirm).toHaveBeenCalledWith("#ffffff");
	});

	it("the hue bar changes the color", async () => {
		const { onConfirm, user } = renderPicker("#ff0000");

		fireEvent.change(screen.getByRole("slider", { name: "Matiz" }), {
			target: { value: "240" },
		});
		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onConfirm).toHaveBeenCalledWith("#0000ff");
	});

	it("the square moves with the arrow keys: left and right the saturation, up and down the brightness", async () => {
		const { onConfirm, user } = renderPicker("#ff0000");
		const square = screen.getByRole("slider", { name: "Saturação e brilho" });

		square.focus();
		await user.keyboard(
			"{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}",
		);
		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onConfirm).toHaveBeenCalledWith("#ff8080");
	});

	it("Cancelar leaves the color alone", async () => {
		const { onConfirm, onCancel, user } = renderPicker();

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("an unfinished code keeps the last color", async () => {
		const { onConfirm, user } = renderPicker();
		const hex = screen.getByRole("textbox", { name: "Hex" });

		await user.clear(hex);
		await user.type(hex, "12");
		await user.click(screen.getByRole("button", { name: "Ok" }));

		expect(onConfirm).toHaveBeenCalledWith("#253e81");
	});
});
