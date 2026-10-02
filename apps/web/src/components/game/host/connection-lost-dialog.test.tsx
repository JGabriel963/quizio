import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConnectionLostDialog } from "./connection-lost-dialog";

function renderDialog(
	watch: Partial<Parameters<typeof ConnectionLostDialog>[0]["watch"]> = {},
) {
	const retryNow = vi.fn();
	const user = userEvent.setup();
	render(
		<>
			<button type="button">Avançar</button>
			<ConnectionLostDialog
				watch={{
					lost: true,
					retrying: false,
					retryInSeconds: 5,
					retryNow,
					...watch,
				}}
			/>
		</>,
	);
	return { retryNow, user };
}

const dialog = () =>
	screen.getByRole("alertdialog", { name: "Conexão perdida" });

describe("ConnectionLostDialog (spec 013)", () => {
	it("shows the title, the texts, the countdown and Reconectar", () => {
		renderDialog();

		const shown = within(dialog());
		expect(
			shown.getByText(
				"Vamos tentar reconectar automaticamente. O jogo continua de onde parou assim que a conexão voltar.",
			),
		).toBeInTheDocument();
		expect(
			shown.getByText(
				"Se não reconectar, verifique a sua internet e clique em Reconectar.",
			),
		).toBeInTheDocument();
		expect(shown.getByRole("status")).toHaveTextContent(
			"Tentando novamente em 5 segundos…",
		);
		expect(shown.getByRole("button", { name: "Reconectar" })).toBeEnabled();
	});

	it("counts in the singular at the last second", () => {
		renderDialog({ retryInSeconds: 1 });

		expect(within(dialog()).getByRole("status")).toHaveTextContent(
			"Tentando novamente em 1 segundo…",
		);
	});

	it("shows Reconectando… during a retry", () => {
		renderDialog({ retrying: true, retryInSeconds: 0 });

		expect(within(dialog()).getByRole("status")).toHaveTextContent(
			"Reconectando…",
		);
	});

	it("Reconectar tries at once", async () => {
		const { retryNow, user } = renderDialog();

		await user.click(screen.getByRole("button", { name: "Reconectar" }));

		expect(retryNow).toHaveBeenCalledTimes(1);
	});

	it("Escape and a click outside do not close it", async () => {
		const { user } = renderDialog();

		await user.keyboard("{Escape}");
		const backdrop = document.querySelector(
			'[data-slot="alert-dialog-overlay"]',
		);
		if (backdrop) {
			await user.click(backdrop);
		}

		expect(dialog()).toBeInTheDocument();
		// No way out but the connection: no close button either.
		expect(within(dialog()).getAllByRole("button")).toHaveLength(1);
	});

	it("is an alert dialog and focuses Reconectar", async () => {
		renderDialog();

		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Reconectar" })).toHaveFocus(),
		);
		// The screen behind it does not answer while it is open.
		expect(
			screen.queryByRole("button", { name: "Avançar" }),
		).not.toBeInTheDocument();
	});

	it("shows nothing while connected", () => {
		renderDialog({ lost: false, retryInSeconds: 0 });

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Avançar" })).toBeEnabled();
	});
});
