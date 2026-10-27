import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "@/testing/render-with-router";

import { ShareAssignmentDialog } from "./share-assignment-dialog";

const DAY_MS = 24 * 60 * 60 * 1000;
const assignment = {
	gameId: "game-1",
	name: "Capitais",
	pin: "04352236",
	deadline: new Date(2026, 9, 22, 12, 0).toISOString(),
	remainingMs: 3 * DAY_MS,
	participantCount: 0,
};

async function renderDialog(onAssignToGroups?: () => void) {
	const user = userEvent.setup();
	const onOpenChange = vi.fn();
	renderWithRouter(
		<ShareAssignmentDialog
			open
			onOpenChange={onOpenChange}
			origin="https://quizio.app"
			assignment={assignment}
			onAssignToGroups={onAssignToGroups}
		/>,
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Compartilhe com os participantes",
	});
	return { user, dialog, onOpenChange };
}

afterEach(() => {
	Reflect.deleteProperty(navigator, "share");
});

describe("ShareAssignmentDialog (spec 029, RN-21 to RN-25)", () => {
	it("shows the activity card, the actions and the eight-digit PIN", async () => {
		const { dialog } = await renderDialog();

		expect(
			within(dialog).getByText(
				"Envie o link, mostre o código QR ou compartilhe o PIN abaixo. Acompanhe o progresso a qualquer momento no relatório.",
			),
		).toBeInTheDocument();
		const card = within(dialog).getByRole("link", { name: /Capitais/ });
		expect(card).toHaveTextContent("Termina: em 3 dias");
		expect(card).toHaveTextContent("0");
		expect(
			within(dialog).getByRole("button", { name: "Compartilhar" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Adicionar participantes" }),
		).toBeInTheDocument();
		expect(within(dialog).getByText("0435 2236")).toBeInTheDocument();
	});

	it("the activity card links to the report", async () => {
		const { dialog } = await renderDialog();

		expect(
			within(dialog).getByRole("link", { name: /Capitais/ }),
		).toHaveAttribute("href", "/reports/game-1");
	});

	it("Copiar link copies the link and says so", async () => {
		const { user, dialog } = await renderDialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Copiar link" }),
		);

		expect(await navigator.clipboard.readText()).toBe(
			"https://quizio.app/assignment/game-1",
		);
		expect(await within(dialog).findByText("Link copiado")).toBeInTheDocument();
	});

	it("the PIN's icon copies the PIN", async () => {
		const { user, dialog } = await renderDialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Copiar PIN" }),
		);

		expect(await navigator.clipboard.readText()).toBe("04352236");
		expect(await within(dialog).findByText("PIN copiado")).toBeInTheDocument();
	});

	it("Compartilhar uses the device's share when there is one", async () => {
		const share = vi.fn(async () => {});
		Object.defineProperty(navigator, "share", {
			value: share,
			configurable: true,
		});
		const { user, dialog } = await renderDialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Compartilhar" }),
		);

		expect(share).toHaveBeenCalledWith({
			title: "Capitais",
			text: "Jogue Capitais até 22 de out. de 2026, 12:00: https://quizio.app/assignment/game-1",
			url: "https://quizio.app/assignment/game-1",
		});
	});

	it("without it, Compartilhar offers WhatsApp, Telegram, Facebook, X, E-mail and Copiar link", async () => {
		const { user, dialog } = await renderDialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Compartilhar" }),
		);

		const items = await screen.findAllByRole("menuitem");
		expect(items.map((item) => item.textContent?.trim())).toEqual([
			"WhatsApp",
			"Telegram",
			"Facebook",
			"X",
			"E-mail",
			"Copiar link",
		]);
		expect(screen.getByRole("menuitem", { name: "WhatsApp" })).toHaveAttribute(
			"href",
			expect.stringMatching(/^https:\/\/wa\.me\/\?text=Jogue%20Capitais/),
		);
	});

	it("Atribuir a grupos is active for the creator; Atribuir por e-mail stays Em breve, without upgrade (spec 038, RN-25)", async () => {
		const onAssignToGroups = vi.fn();
		const { user, dialog } = await renderDialog(onAssignToGroups);

		await user.click(
			within(dialog).getByRole("button", { name: "Adicionar participantes" }),
		);

		const email = await screen.findByRole("menuitem", {
			name: /Atribuir por e-mail/,
		});
		expect(email).toHaveAttribute("aria-disabled", "true");
		expect(email).toHaveTextContent("Em breve");
		expect(screen.queryByText(/upgrade|premium/i)).toBeNull();
		const groups = screen.getByRole("menuitem", { name: "Atribuir a grupos" });
		expect(groups).not.toHaveAttribute("aria-disabled");
		await user.click(groups);
		expect(onAssignToGroups).toHaveBeenCalled();
	});

	it("without the action, Atribuir a grupos is not offered", async () => {
		const { user, dialog } = await renderDialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Adicionar participantes" }),
		);

		await screen.findByRole("menuitem", { name: /Atribuir por e-mail/ });
		expect(
			screen.queryByRole("menuitem", { name: /Atribuir a grupos/ }),
		).toBeNull();
	});
});
