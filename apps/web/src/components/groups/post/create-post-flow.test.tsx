import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LibraryItemView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { CreatePostFlow, type GroupFileUploader } from "./create-post-flow";

const quiz = {
	id: "quiz-1",
	title: "Capitais",
	description: "",
	coverImageUrl: null,
	visibility: "private",
	status: "published",
	hasUnpublishedChanges: false,
	questionCount: 5,
	updatedAt: new Date().toISOString(),
	trashedAt: null,
} as LibraryItemView;
const setup = {
	maxDeadlineDays: 28,
	options: {
		gameCharacters: false,
		questionTimer: true,
		randomizeAnswers: false,
	},
};

function renderFlow({
	onUpload = vi.fn<GroupFileUploader>(async () => ({ key: "groups/g/a.pdf" })),
	canAssign = true,
} = {}) {
	const user = userEvent.setup();
	const onPost = vi.fn(async () => {});
	const onAssign = vi.fn(async () => {});
	const onDiscardUpload = vi.fn();
	const onClose = vi.fn();
	renderWithRouter(
		<CreatePostFlow
			open
			canAssign={canAssign}
			quizzes={[quiz]}
			ownerName="Ana"
			setup={setup}
			onUpload={onUpload}
			onDiscardUpload={onDiscardUpload}
			onPost={onPost}
			onAssign={onAssign}
			onClose={onClose}
		/>,
	);
	const post = () => screen.findByRole("dialog", { name: "Criar publicação" });
	return { user, onUpload, onPost, onAssign, onDiscardUpload, onClose, post };
}

const pdf = () =>
	new File(["%PDF"], "apostila.pdf", { type: "application/pdf" });

describe("CreatePostFlow (spec 036)", () => {
	it("Publicar sends the text", async () => {
		const { user, onPost, onClose, post } = renderFlow();

		await user.type(
			within(await post()).getByPlaceholderText("Digite seu texto"),
			"Prova na sexta",
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Publicar" }),
		);

		expect(onPost).toHaveBeenCalledWith({
			message: "Prova na sexta",
			uploadKey: undefined,
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("Publicar with a file calls post with the upload key", async () => {
		const { user, onUpload, onPost, post } = renderFlow();

		await user.upload(
			within(await post()).getByLabelText("Escolher PDF"),
			pdf(),
		);
		expect(await within(await post()).findByText("apostila.pdf")).toBeVisible();
		await user.click(
			within(await post()).getByRole("button", { name: "Publicar" }),
		);

		expect(onUpload).toHaveBeenCalledWith(
			"pdf",
			expect.any(File),
			expect.any(Function),
		);
		expect(onPost).toHaveBeenCalledWith({
			message: "",
			uploadKey: "groups/g/a.pdf",
		});
	});

	it("a wrong file is told before any request", async () => {
		const { onUpload, post } = renderFlow();
		// The browser's own filter is off, as when a file is dragged in.
		const user = userEvent.setup({ applyAccept: false });

		await user.upload(
			within(await post()).getByLabelText("Escolher imagem"),
			new File(["x"], "a.txt", { type: "text/plain" }),
		);

		expect(await within(await post()).findByRole("alert")).toHaveTextContent(
			"Use uma imagem JPG, PNG, GIF ou WebP.",
		);
		expect(onUpload).not.toHaveBeenCalled();
	});

	it("a failed upload brings the bar back with its message", async () => {
		const { user, post } = renderFlow({
			onUpload: vi.fn<GroupFileUploader>(async () => {
				throw new Error("network");
			}),
		});

		await user.upload(
			within(await post()).getByLabelText("Escolher PDF"),
			pdf(),
		);

		expect(await within(await post()).findByRole("alert")).toHaveTextContent(
			"Não foi possível enviar o arquivo.",
		);
		expect(
			within(await post()).getByText("Adicionar à minha publicação"),
		).toBeVisible();
	});

	it("Cancelar discards the upload", async () => {
		const { user, onDiscardUpload, onClose, post } = renderFlow();

		await user.upload(
			within(await post()).getByLabelText("Escolher PDF"),
			pdf(),
		);
		await within(await post()).findByText("apostila.pdf");
		await user.click(
			within(await post()).getByRole("button", { name: "Cancelar" }),
		);

		expect(onDiscardUpload).toHaveBeenCalledWith("groups/g/a.pdf");
		expect(onClose).toHaveBeenCalled();
	});

	it("an upload that ends after X is discarded", async () => {
		let finish: (value: { key: string }) => void = () => {};
		const { user, onDiscardUpload, post } = renderFlow({
			onUpload: vi.fn<GroupFileUploader>(
				() =>
					new Promise((resolve) => {
						finish = resolve;
					}),
			),
		});

		await user.upload(
			within(await post()).getByLabelText("Escolher PDF"),
			pdf(),
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Remover anexo" }),
		);
		finish({ key: "groups/g/late.pdf" });

		await waitFor(() =>
			expect(onDiscardUpload).toHaveBeenCalledWith("groups/g/late.pdf"),
		);
		expect(
			within(await post()).getByText("Adicionar à minha publicação"),
		).toBeVisible();
	});

	it("Publicar with a quiz calls assign with the text; nothing is created before", async () => {
		const { user, onAssign, onPost, post } = renderFlow();

		await user.type(
			within(await post()).getByPlaceholderText("Digite seu texto"),
			"Revisem",
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Atribuir kahoot" }),
		);
		await user.click(
			within(
				await screen.findByRole("dialog", { name: "Selecionar kahoot" }),
			).getByRole("button", { name: /Capitais/ }),
		);
		await user.click(
			within(
				await screen.findByRole("dialog", {
					name: "Configurações da atividade atribuída",
				}),
			).getByRole("button", { name: "Adicionar à publicação" }),
		);
		const dialog = await post();
		expect(within(dialog).getByText("Capitais")).toBeVisible();
		expect(within(dialog).getByPlaceholderText("Digite seu texto")).toHaveValue(
			"Revisem",
		);
		expect(onAssign).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole("button", { name: "Publicar" }));

		expect(onAssign).toHaveBeenCalledWith({
			quizId: "quiz-1",
			deadline: expect.any(Date),
			options: setup.options,
			message: "Revisem",
		});
		expect(onPost).not.toHaveBeenCalled();
	});

	it("Fechar in Selecionar kahoot goes back to the post, keeping the text", async () => {
		const { user, post } = renderFlow();

		await user.type(
			within(await post()).getByPlaceholderText("Digite seu texto"),
			"Oi",
		);
		await user.click(
			within(await post()).getByRole("button", { name: "Atribuir kahoot" }),
		);
		await user.click(
			within(
				await screen.findByRole("dialog", { name: "Selecionar kahoot" }),
			).getByRole("button", { name: "Fechar" }),
		);

		const dialog = await post();
		expect(within(dialog).getByPlaceholderText("Digite seu texto")).toHaveValue(
			"Oi",
		);
		expect(
			within(dialog).getByText("Adicionar à minha publicação"),
		).toBeVisible();
	});
});
