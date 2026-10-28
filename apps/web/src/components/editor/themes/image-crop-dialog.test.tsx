import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { THEME_CROP_ASPECT } from "@/lib/theme-image-crop";

import { ImageCropDialog } from "./image-crop-dialog";

const photo = new File(["x"], "foto.png", { type: "image/png" });

function renderDialog(
	shapes: ("landscape" | "square")[] = ["landscape", "square"],
) {
	const cropped = new File(["y"], "theme.webp", { type: "image/webp" });
	const crop = vi.fn(async () => cropped);
	const onSave = vi.fn();
	const onCancel = vi.fn();
	render(
		<ImageCropDialog
			file={photo}
			shapes={shapes}
			outputWidth={800}
			crop={crop}
			onSave={onSave}
			onCancel={onCancel}
		/>,
	);
	return { crop, cropped, onSave, onCancel, user: userEvent.setup() };
}

describe("ImageCropDialog (spec 043)", () => {
	it("opens on Paisagem with the zoom out", () => {
		renderDialog();

		expect(
			screen.getByRole("dialog", { name: "Recortar imagem" }),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Paisagem" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("1");
	});

	it("Salvar cuts the framing in the chosen shape and hands the file over", async () => {
		const { crop, cropped, onSave, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Quadrado" }));
		fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), {
			target: { value: "2" },
		});
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(crop).toHaveBeenCalledWith(
			photo,
			{ zoom: 2, x: 0.5, y: 0.5 },
			THEME_CROP_ASPECT.square,
			800,
		);
		expect(onSave).toHaveBeenCalledWith(cropped);
	});

	it("a background has only Paisagem, with no choice to make", () => {
		renderDialog(["landscape"]);

		expect(screen.queryByRole("button", { name: "Quadrado" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Paisagem" })).toBeNull();
	});

	it("Fechar gives up", async () => {
		const { crop, onCancel, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(crop).not.toHaveBeenCalled();
	});
});
