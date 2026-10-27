import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PostAttachment } from "@/lib/group-post-state";
import { renderWithRouter } from "@/testing/render-with-router";

import { CreatePostDialog } from "./create-post-dialog";

function Harness({
	attachment = { kind: "none" },
	canAssign = false,
	canShare = false,
	onPickFile = () => {},
	onAssign = () => {},
	onShare = () => {},
	onRemoveAttachment = () => {},
	onPublish = () => {},
}: {
	attachment?: PostAttachment;
	canAssign?: boolean;
	canShare?: boolean;
	onPickFile?: (type: "image" | "pdf", file: File) => void;
	onAssign?: () => void;
	onShare?: () => void;
	onRemoveAttachment?: () => void;
	onPublish?: () => void;
}) {
	const [message, setMessage] = useState("");
	return (
		<CreatePostDialog
			open
			message={message}
			attachment={attachment}
			canAssign={canAssign}
			canShare={canShare}
			canPublish={message.trim() !== "" || attachment.kind !== "none"}
			publishing={false}
			error={null}
			onMessageChange={setMessage}
			onPickFile={onPickFile}
			onAssign={onAssign}
			onShare={onShare}
			onRemoveAttachment={onRemoveAttachment}
			onCancel={() => {}}
			onPublish={onPublish}
		/>
	);
}

async function open(props: Parameters<typeof Harness>[0] = {}) {
	const user = userEvent.setup();
	renderWithRouter(<Harness {...props} />);
	const dialog = await screen.findByRole("dialog", {
		name: "Criar publicação",
	});
	return { user, dialog };
}

describe("CreatePostDialog (spec 036, RN-04 to RN-11)", () => {
	it("counter from 500 to 0; only spaces keep Publicar disabled", async () => {
		const { user, dialog } = await open();
		const field = within(dialog).getByPlaceholderText("Digite seu texto");
		const publish = within(dialog).getByRole("button", { name: "Publicar" });

		expect(within(dialog).getByText("500")).toBeVisible();
		expect(publish).toBeDisabled();
		await user.type(field, "   ");
		expect(publish).toBeDisabled();
		await user.clear(field);
		await user.click(field);
		await user.paste("a".repeat(510));
		expect(field).toHaveValue("a".repeat(500));
		expect(within(dialog).getByText("0")).toBeVisible();
		expect(publish).toBeEnabled();
	});

	it("the attach bar shows Imagem and PDF, Compartilhar kahoot only for who may share and Atribuir kahoot only for who may assign", async () => {
		const { dialog } = await open();

		expect(
			within(dialog).getByText("Adicionar à minha publicação"),
		).toBeVisible();
		expect(
			within(dialog).getByRole("button", { name: "Imagem" }),
		).toBeVisible();
		expect(within(dialog).getByRole("button", { name: "PDF" })).toBeVisible();
		expect(
			within(dialog).queryByRole("button", { name: /Compartilhar kahoot/ }),
		).toBeNull();
		expect(
			within(dialog).queryByRole("button", { name: "Atribuir kahoot" }),
		).toBeNull();
	});

	it("Compartilhar kahoot for who may share (spec 037, RN-03)", async () => {
		const onShare = vi.fn();
		const { user, dialog } = await open({ canShare: true, onShare });

		await user.click(
			within(dialog).getByRole("button", { name: "Compartilhar kahoot" }),
		);

		expect(onShare).toHaveBeenCalled();
	});

	it("Atribuir kahoot for who may assign, with its tooltip", async () => {
		const onAssign = vi.fn();
		const { user, dialog } = await open({ canAssign: true, onAssign });
		const assign = within(dialog).getByRole("button", {
			name: "Atribuir kahoot",
		});

		await user.hover(assign);
		// The tooltip shows the name after its delay.
		expect(
			await screen.findByText("Atribuir kahoot", {}, { timeout: 3000 }),
		).toBeInTheDocument();
		await user.click(assign);
		expect(onAssign).toHaveBeenCalled();
	});

	it("choosing a file hands it over by type", async () => {
		const onPickFile = vi.fn();
		const { user, dialog } = await open({ onPickFile });
		const image = new File(["x"], "quadro.png", { type: "image/png" });
		const pdf = new File(["x"], "apostila.pdf", { type: "application/pdf" });

		await user.upload(within(dialog).getByLabelText("Escolher imagem"), image);
		await user.upload(within(dialog).getByLabelText("Escolher PDF"), pdf);

		expect(onPickFile).toHaveBeenNthCalledWith(1, "image", image);
		expect(onPickFile).toHaveBeenNthCalledWith(2, "pdf", pdf);
	});

	it("an image shows its progress, then the preview; Publicar without text", async () => {
		const { dialog } = await open({
			attachment: {
				kind: "uploading",
				type: "image",
				name: "quadro.png",
				sizeBytes: 2048,
				token: 1,
				progress: 0.4,
				previewUrl: "blob:quadro",
			},
		});

		expect(
			within(dialog).getByRole("progressbar", { name: "Enviando quadro.png" }),
		).toHaveAttribute("aria-valuenow", "40");
		expect(
			within(dialog).queryByText("Adicionar à minha publicação"),
		).toBeNull();
		expect(within(dialog).getByAltText("Imagem anexada")).toHaveAttribute(
			"src",
			"blob:quadro",
		);
	});

	it("a PDF shows its name and size, and X takes it out", async () => {
		const onRemoveAttachment = vi.fn();
		const { user, dialog } = await open({
			onRemoveAttachment,
			attachment: {
				kind: "file",
				type: "pdf",
				key: "groups/g/a.pdf",
				name: "apostila.pdf",
				sizeBytes: 2.4 * 1024 * 1024,
				previewUrl: null,
			},
		});

		expect(dialog).toHaveTextContent("apostila.pdf");
		expect(dialog).toHaveTextContent("2,4 MB");
		expect(
			within(dialog).getByRole("button", { name: "Publicar" }),
		).toBeEnabled();
		await user.click(
			within(dialog).getByRole("button", { name: "Remover anexo" }),
		);
		expect(onRemoveAttachment).toHaveBeenCalled();
	});
});
