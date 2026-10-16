import type { Avatar } from "@quizio/core/game/domain/avatar";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AvatarEditor } from "./avatar-editor";

const koala: Avatar = { character: "koala", accessory: "top-hat" };

function renderEditor(
	options: { onChange?: (avatar: Avatar) => Promise<void> } = {},
) {
	const onChange = vi.fn(options.onChange ?? (async () => {}));
	const onClose = vi.fn();
	render(
		<AvatarEditor open avatar={koala} onChange={onChange} onClose={onClose} />,
	);
	return { onChange, onClose, user: userEvent.setup() };
}

/** The avatar drawn at the top of the editor. */
const preview = () =>
	[...screen.getByTestId("avatar-preview").querySelectorAll("img")].map(
		(image) => image.getAttribute("src"),
	);

describe("AvatarEditor (spec 028)", () => {
	it("opens on the character tab with the current one pressed", () => {
		renderEditor();

		expect(screen.getByRole("tab", { name: "Personagem" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("button", { name: "Coala" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Tigre" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByRole("button", { name: "Pronto" })).toBeInTheDocument();
	});

	it("the accessory tab starts with none over a neutral head", async () => {
		const { user } = renderEditor();

		await user.click(screen.getByRole("tab", { name: "Acessório" }));

		const grid = screen.getByRole("tabpanel");
		const [first] = within(grid).getAllByRole("button");
		expect(first).toHaveAccessibleName("Nenhum");
		expect(
			within(grid)
				.getByRole("button", { name: "Cartola" })
				.querySelector('img[src="/avatars/neutral-head.svg"]'),
		).not.toBeNull();
		expect(screen.getByRole("button", { name: "Cartola" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("a tap changes the preview at once and calls onChange", async () => {
		let finish = () => {};
		const { user, onChange } = renderEditor({
			onChange: () =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		});

		await user.click(screen.getByRole("button", { name: "Tigre" }));

		expect(onChange).toHaveBeenCalledWith({
			character: "tiger",
			accessory: "top-hat",
		});
		expect(preview()[0]).toBe("/avatars/characters/tiger.svg");
		expect(screen.getByRole("button", { name: "Tigre" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		finish();
	});

	it("none sends a null accessory", async () => {
		const { user, onChange } = renderEditor();

		await user.click(screen.getByRole("tab", { name: "Acessório" }));
		await user.click(screen.getByRole("button", { name: "Nenhum" }));

		expect(onChange).toHaveBeenCalledWith({
			character: "koala",
			accessory: null,
		});
		expect(preview()).toEqual(["/avatars/characters/koala.svg"]);
	});

	it("done closes the editor", async () => {
		const { user, onClose } = renderEditor();

		await user.click(screen.getByRole("button", { name: "Pronto" }));

		expect(onClose).toHaveBeenCalled();
	});

	it("a failed change goes back to the previous avatar and shows the notice", async () => {
		const { user } = renderEditor({
			onChange: async () => {
				throw new Error("offline");
			},
		});

		await user.click(screen.getByRole("button", { name: "Tigre" }));

		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Não foi possível trocar o avatar.",
			),
		);
		expect(preview()[0]).toBe("/avatars/characters/koala.svg");
		expect(screen.getByRole("button", { name: "Coala" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});
});
