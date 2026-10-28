import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	CustomThemeDialog,
	type CustomThemeDialogActions,
} from "./custom-theme-dialog";

const savedView = {
	pattern: "waves" as const,
	backgroundColor: "#46178f",
	imageUrl: null,
	imageTone: null,
	accentColor: "#1368ce",
	logoUrl: null,
};

afterEach(() => localStorage.clear());

function fakeActions(
	overrides: Partial<CustomThemeDialogActions> = {},
): CustomThemeDialogActions {
	return {
		upload: vi.fn(async (file: File) => ({
			key: `themes/u1/${file.name}`,
			url: `https://media.test/themes/u1/${file.name}`,
		})),
		discardUploads: vi.fn(),
		save: vi.fn(async (input) => ({
			id: input.themeId ?? "theme-new",
			name: input.name,
			look: input.look,
			view: savedView,
		})),
		measureTone: vi.fn(async () => "dark" as const),
		// The canvas is the browser's: here the "cut" file keeps its name.
		crop: vi.fn(
			async (file: Blob) =>
				new File([file], (file as File).name, { type: "image/webp" }),
		),
		...overrides,
	};
}

function renderDialog(
	actions = fakeActions(),
	theme: Parameters<typeof CustomThemeDialog>[0]["theme"] = null,
) {
	const onClose = vi.fn();
	const onSaved = vi.fn();
	render(
		<CustomThemeDialog
			open
			theme={theme}
			actions={actions}
			onClose={onClose}
			onSaved={onSaved}
		/>,
	);
	return { actions, onClose, onSaved, user: userEvent.setup() };
}

/** Opens a row's popover by its button and gives it back. */
async function openRow(user: ReturnType<typeof userEvent.setup>, name: string) {
	await user.click(screen.getByRole("button", { name }));
	return screen.findByRole("dialog", { name });
}

describe("CustomThemeDialog (spec 043)", () => {
	it("creates a theme and hands it over to be applied (RN-15, CA-02)", async () => {
		const { actions, onSaved, onClose, user } = renderDialog();
		const name = screen.getByRole("textbox", { name: "Nome" });
		await user.clear(name);
		await user.type(name, "Escola Azul");

		const background = await openRow(user, "Plano de fundo");
		await user.click(
			within(background).getByRole("radio", { name: "Montanhas" }),
		);
		await user.keyboard("{Escape}");
		const accent = await openRow(user, "Cor de contraste");
		await user.click(within(accent).getByRole("radio", { name: "#FBD848" }));
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
		expect(actions.save).toHaveBeenCalledWith({
			themeId: null,
			name: "Escola Azul",
			look: {
				background: { kind: "pattern", pattern: "peaks", color: "#46178f" },
				accentColor: "#fbd848",
				logoKey: null,
			},
		});
		expect(onClose).toHaveBeenCalled();
	});

	it("opening Cor de contraste shows the lobby, where the accent is", async () => {
		const { user } = renderDialog();
		await user.click(
			screen.getByRole("button", { name: "Mostrar a pergunta" }),
		);

		await openRow(user, "Cor de contraste");

		expect(
			document.querySelector('[aria-label="Prévia: Lobby"]'),
		).toBeVisible();
	});

	it("the background's Cor tab colors the pattern", async () => {
		const { actions, user } = renderDialog();

		const background = await openRow(user, "Plano de fundo");
		await user.click(within(background).getByRole("button", { name: "Cor" }));
		await user.click(
			within(background).getByRole("radio", { name: "#2C6E78" }),
		);
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(actions.save).toHaveBeenCalledWith(
				expect.objectContaining({
					look: expect.objectContaining({
						background: { kind: "pattern", pattern: "waves", color: "#2c6e78" },
					}),
				}),
			),
		);
	});

	it("a color of the picker is applied and kept in Cores personalizadas", async () => {
		const { actions, user } = renderDialog();

		const accent = await openRow(user, "Cor de contraste");
		await user.click(within(accent).getByRole("button", { name: "Nova cor" }));
		const hex = within(accent).getByRole("textbox", { name: "Hex" });
		await user.clear(hex);
		await user.type(hex, "253e81");
		await user.click(within(accent).getByRole("button", { name: "Ok" }));

		expect(
			within(accent).getByRole("radio", { name: "#253E81" }),
		).toBeChecked();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		await waitFor(() =>
			expect(actions.save).toHaveBeenCalledWith(
				expect.objectContaining({
					look: expect.objectContaining({ accentColor: "#253e81" }),
				}),
			),
		);
		expect(
			JSON.parse(localStorage.getItem("quizio:custom-colors") ?? "[]"),
		).toEqual(["#253e81"]);
	});

	it("an illegible color of the picker is refused (RN-11, CA-08)", async () => {
		const { user } = renderDialog();

		const accent = await openRow(user, "Cor de contraste");
		await user.click(within(accent).getByRole("button", { name: "Nova cor" }));
		const hex = within(accent).getByRole("textbox", { name: "Hex" });
		await user.clear(hex);
		await user.type(hex, "777777");
		await user.click(within(accent).getByRole("button", { name: "Ok" }));

		expect(
			within(accent).getByText(
				"Essa cor deixa o texto difícil de ler. Escolha uma mais clara ou mais escura.",
			),
		).toBeVisible();
		expect(within(accent).getByRole("textbox", { name: "Hex" })).toBeVisible();
	});

	it("a logo is chosen, cut in Paisagem or Quadrado and sent (RN-07)", async () => {
		const { actions, user } = renderDialog();

		const logo = await openRow(user, "Adicionar logo");
		await user.upload(
			within(logo).getByLabelText("Selecionar logotipo"),
			new File(["x"], "logo.png", { type: "image/png" }),
		);
		const crop = await screen.findByRole("dialog", { name: "Recortar imagem" });
		await user.click(within(crop).getByRole("button", { name: "Quadrado" }));
		await user.click(within(crop).getByRole("button", { name: "Salvar" }));

		await screen.findByRole("button", { name: "Trocar logo" });
		expect(actions.crop).toHaveBeenCalledWith(
			expect.any(File),
			{ zoom: 1, x: 0.5, y: 0.5 },
			1,
			800,
		);
		expect(actions.upload).toHaveBeenCalled();
	});

	it("a refused file is said before anything is sent (CA-06)", async () => {
		const { actions, user } = renderDialog();

		const logo = await openRow(user, "Adicionar logo");
		await userEvent
			.setup({ applyAccept: false })
			.upload(
				within(logo).getByLabelText("Selecionar logotipo"),
				new File(["x"], "logo.pdf", { type: "application/pdf" }),
			);

		expect(
			within(logo).getByText(
				"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
			),
		).toBeVisible();
		expect(actions.upload).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("dialog", { name: "Recortar imagem" }),
		).toBeNull();
		expect(user).toBeDefined();
	});

	it("an image background is cut in Paisagem, measured and sent with its tone (RN-12)", async () => {
		const actions = fakeActions({
			measureTone: vi.fn(async () => "light" as const),
		});
		const { user } = renderDialog(actions);

		const background = await openRow(user, "Plano de fundo");
		await user.upload(
			within(background).getByLabelText("Carregar imagem de fundo"),
			new File(["x"], "bg.jpg", { type: "image/jpeg" }),
		);
		const crop = await screen.findByRole("dialog", { name: "Recortar imagem" });
		expect(within(crop).queryByRole("button", { name: "Quadrado" })).toBeNull();
		await user.click(within(crop).getByRole("button", { name: "Salvar" }));
		await waitFor(() => expect(actions.upload).toHaveBeenCalled());
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(actions.save).toHaveBeenCalledWith(
				expect.objectContaining({
					look: expect.objectContaining({
						background: {
							kind: "image",
							key: "themes/u1/bg.jpg",
							tone: "light",
						},
					}),
				}),
			),
		);
	});

	it("Editar opens with the theme's values", () => {
		renderDialog(fakeActions(), {
			id: "theme-1",
			name: "Escola Azul",
			look: {
				background: { kind: "pattern", pattern: "rings", color: "#1b2a6b" },
				accentColor: "#ffd84d",
				logoKey: null,
			},
			view: { ...savedView, pattern: "rings", backgroundColor: "#1b2a6b" },
		});

		expect(screen.getByRole("heading", { name: "Editar tema" })).toBeVisible();
		expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue(
			"Escola Azul",
		);
	});

	it("Cancelar asks Descartar este tema? and discards the uploads (RN-15, CA-10)", async () => {
		const { actions, onClose, user } = renderDialog();
		const logo = await openRow(user, "Adicionar logo");
		await user.upload(
			within(logo).getByLabelText("Selecionar logotipo"),
			new File(["x"], "logo.png", { type: "image/png" }),
		);
		const crop = await screen.findByRole("dialog", { name: "Recortar imagem" });
		await user.click(within(crop).getByRole("button", { name: "Salvar" }));
		await screen.findByRole("button", { name: "Trocar logo" });

		await user.click(screen.getByRole("button", { name: "Cancelar" }));
		await user.click(
			within(
				await screen.findByRole("alertdialog", {
					name: "Descartar este tema?",
				}),
			).getByRole("button", { name: "Descartar" }),
		);

		expect(actions.discardUploads).toHaveBeenCalledWith(["themes/u1/logo.png"]);
		expect(onClose).toHaveBeenCalled();
	});

	it("Cancelar with nothing changed closes at once", async () => {
		const { onClose, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(onClose).toHaveBeenCalled();
	});

	it("a failed save keeps the dialog with the message (CA-18)", async () => {
		const { onClose, onSaved, user } = renderDialog(
			fakeActions({
				save: vi.fn(async () => {
					throw new Error("offline");
				}),
			}),
		);

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(
			await screen.findByText("Não foi possível salvar o tema. Tente de novo."),
		).toBeVisible();
		expect(onSaved).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("is filled and saved with the keyboard (CA-25)", async () => {
		const { actions, user } = renderDialog();

		const name = screen.getByRole("textbox", { name: "Nome" });
		await user.clear(name);
		await user.type(name, "Teclado");
		screen.getByRole("button", { name: "Cor de contraste" }).focus();
		await user.keyboard("{Enter}");
		const accent = await screen.findByRole("dialog", {
			name: "Cor de contraste",
		});
		within(accent).getByRole("radio", { name: "#FBD848" }).focus();
		await user.keyboard(" ");
		await user.keyboard("{Escape}");
		screen.getByRole("button", { name: "Salvar" }).focus();
		await user.keyboard("{Enter}");

		await waitFor(() =>
			expect(actions.save).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Teclado",
					look: expect.objectContaining({ accentColor: "#fbd848" }),
				}),
			),
		);
	});
});
