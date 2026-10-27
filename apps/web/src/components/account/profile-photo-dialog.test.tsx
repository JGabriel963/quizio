import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import {
	ProfilePhotoDialog,
	type UploadProfilePhoto,
} from "./profile-photo-dialog";

function aFile(type = "image/png", bytes = 2 * 1024 * 1024) {
	const file = new File(["x"], "foto.png", { type });
	Object.defineProperty(file, "size", { value: bytes });
	return file;
}

async function setup({
	hasPhoto = false,
	upload = vi.fn<UploadProfilePhoto>(async () => {}),
	onRemove = vi.fn(async () => {}),
}: {
	hasPhoto?: boolean;
	upload?: Mock<UploadProfilePhoto>;
	onRemove?: Mock<() => Promise<void>>;
} = {}) {
	const user = userEvent.setup({ applyAccept: false });
	const onClose = vi.fn();
	URL.createObjectURL = vi.fn(() => "blob:preview");
	URL.revokeObjectURL = vi.fn();
	renderWithRouter(
		<ProfilePhotoDialog
			open
			hasPhoto={hasPhoto}
			onClose={onClose}
			upload={upload}
			onRemove={onRemove}
		/>,
	);
	await screen.findByRole("dialog", { name: "Carregar imagem" });
	const input = screen.getByLabelText("Carregar imagem", {
		selector: "input",
	});
	return { user, input, onClose, upload, onRemove };
}

describe("ProfilePhotoDialog (spec 039, RN-07 to RN-11)", () => {
	it("Carregar is disabled without an image, and Cancelar closes", async () => {
		const { user, onClose } = await setup();

		expect(
			screen.getByText("Carregue a imagem ou arraste o arquivo até aqui"),
		).toBeVisible();
		expect(
			screen.getByText(
				"A foto do perfil será pública e poderá ser vista por qualquer pessoa com conta no Quizio.",
			),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Carregar" })).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(onClose).toHaveBeenCalled();
	});

	it("refuses a PDF and 11 MB with the policy message", async () => {
		const { user, input } = await setup();

		await user.upload(input, aFile("application/pdf"));
		expect(
			screen.getByText("Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB."),
		).toBeVisible();

		await user.upload(input, aFile("image/jpeg", 11 * 1024 * 1024));
		expect(screen.getByRole("button", { name: "Carregar" })).toBeDisabled();
	});

	it("shows the crop with zoom, then Carregando, and closes when done", async () => {
		let finish: () => void = () => {};
		const upload = vi.fn<UploadProfilePhoto>(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const { user, input, onClose } = await setup({ upload });

		await user.upload(input, aFile());
		const zoom = screen.getByRole("slider", { name: "Zoom" });
		expect(zoom).toHaveValue("1");
		await user.click(screen.getByRole("button", { name: "Carregar" }));

		expect(screen.getByText("Carregando imagem…")).toBeVisible();
		expect(screen.getByRole("button", { name: "Carregando" })).toBeDisabled();
		expect(upload).toHaveBeenCalledWith(
			expect.any(File),
			expect.objectContaining({ shape: "circle", zoom: 1 }),
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);

		finish();
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("Cancelar during the upload keeps the chosen image", async () => {
		const upload = vi.fn<UploadProfilePhoto>(
			(_file, _crop, { signal }) =>
				new Promise<void>((_, reject) => {
					signal.addEventListener("abort", () =>
						reject(new DOMException("cancelled", "AbortError")),
					);
				}),
		);
		const { user, input, onClose } = await setup({ upload });

		await user.upload(input, aFile());
		await user.click(screen.getByRole("button", { name: "Carregar" }));
		await user.click(screen.getByRole("button", { name: "Cancelar o envio" }));

		expect(await screen.findByRole("slider", { name: "Zoom" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Carregar" })).toBeEnabled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("a failed upload says so and keeps the image", async () => {
		const upload = vi.fn<UploadProfilePhoto>(async () => {
			throw new Error("network");
		});
		const { user, input } = await setup({ upload });

		await user.upload(input, aFile());
		await user.click(screen.getByRole("button", { name: "Carregar" }));

		expect(
			await screen.findByText("Não foi possível carregar a imagem."),
		).toBeVisible();
		expect(screen.getByRole("slider", { name: "Zoom" })).toBeVisible();
	});

	it("no Remover foto without a photo", async () => {
		await setup();

		expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
	});

	it("Remover foto with a photo removes it and closes", async () => {
		const { user, onRemove, onClose } = await setup({ hasPhoto: true });
		await user.click(screen.getByRole("button", { name: "Remover foto" }));

		expect(onRemove).toHaveBeenCalledOnce();
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});
});
