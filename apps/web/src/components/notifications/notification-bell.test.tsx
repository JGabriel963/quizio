import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NotificationBellView } from "./notification-bell";

function renderBell(hasNews: boolean) {
	const onOpenChange = vi.fn();
	const result = render(
		<NotificationBellView
			hasNews={hasNews}
			open={false}
			onOpenChange={onOpenChange}
		>
			<p>Painel</p>
		</NotificationBellView>,
	);
	return { ...result, onOpenChange };
}

describe("NotificationBellView (spec 040, RN-09, RN-10)", () => {
	it("the red dot with hasNews and the label Notificações, há novidades", () => {
		const { container, unmount } = renderBell(true);

		expect(
			screen.getByRole("button", { name: "Notificações, há novidades" }),
		).toBeVisible();
		expect(container.querySelector('[data-slot="news-dot"]')).not.toBeNull();
		unmount();

		const quiet = renderBell(false);
		expect(screen.getByRole("button", { name: "Notificações" })).toBeVisible();
		expect(quiet.container.querySelector('[data-slot="news-dot"]')).toBeNull();
	});

	it("opening asks to open, which the bell turns into seen", async () => {
		const { onOpenChange } = renderBell(true);

		await userEvent
			.setup()
			.click(
				screen.getByRole("button", { name: "Notificações, há novidades" }),
			);

		expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
	});

	it("shows the panel while open", async () => {
		render(
			<NotificationBellView hasNews={false} open onOpenChange={vi.fn()}>
				<p>Painel</p>
			</NotificationBellView>,
		);

		expect(await screen.findByText("Painel")).toBeVisible();
	});
});
