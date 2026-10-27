import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LibraryItemView } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { ShareQuizzesDialog } from "./share-quizzes-dialog";

function anItem(overrides: Partial<LibraryItemView> = {}): LibraryItemView {
	return {
		id: "capitais",
		title: "Capitais",
		description: "",
		coverImageUrl: null,
		visibility: "private",
		status: "published",
		hasUnpublishedChanges: false,
		questionCount: 5,
		updatedAt: new Date().toISOString(),
		trashedAt: null,
		...overrides,
	} as LibraryItemView;
}

const quizzes = [
	anItem(),
	anItem({ id: "rios", title: "Rios" }),
	anItem({ id: "mapas", title: "Mapas" }),
];

async function renderDialog(
	onShare: (ids: readonly string[]) => Promise<unknown> = vi.fn(
		async () => undefined,
	),
) {
	const user = userEvent.setup();
	const onClose = vi.fn();
	renderWithRouter(
		<ShareQuizzesDialog
			open
			quizzes={quizzes}
			ownerName="Ana"
			sharedIds={["mapas"]}
			onShare={onShare}
			onClose={onClose}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Selecionar kahoot",
	});
	const row = (name: string) =>
		within(dialog).getByRole("button", { name: new RegExp(name) });
	return { user, dialog, row, onShare, onClose };
}

describe("ShareQuizzesDialog (spec 037, RN-04 to RN-07)", () => {
	it("selects several quizzes with ✓ Selecionado and shares them", async () => {
		const onShare = vi.fn(async () => undefined);
		const { user, dialog, row, onClose } = await renderDialog(onShare);
		const share = () =>
			within(dialog).getByRole("button", { name: /^Compartilhar/ });

		expect(share()).toBeDisabled();
		await user.click(row("Capitais"));
		expect(row("Capitais")).toHaveAttribute("aria-pressed", "true");
		expect(row("Capitais")).toHaveTextContent("Selecionado");
		expect(share()).toHaveTextContent("Compartilhar 1 kahoot");
		await user.click(row("Rios"));
		expect(share()).toHaveTextContent("Compartilhar 2 kahoots");
		await user.click(share());

		expect(onShare).toHaveBeenCalledWith(["capitais", "rios"]);
		expect(onClose).toHaveBeenCalled();
	});

	it("marks Já compartilhado and keeps it unavailable", async () => {
		const { row } = await renderDialog();

		expect(row("Mapas")).toBeDisabled();
		expect(row("Mapas")).toHaveTextContent("Já compartilhado");
	});

	it("Fechar closes without sharing; a refusal keeps the dialog open with the reason", async () => {
		const onShare = vi.fn(async () => {
			throw { data: { domainCode: "GROUP.QUIZ_ALREADY_SHARED" } };
		});
		const { user, dialog, row, onClose } = await renderDialog(onShare);

		await user.click(row("Capitais"));
		await user.click(
			within(dialog).getByRole("button", { name: "Compartilhar 1 kahoot" }),
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Um dos kahoots já está no grupo.",
		);
		expect(onClose).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole("button", { name: "Fechar" }));
		expect(onClose).toHaveBeenCalled();
	});
});
