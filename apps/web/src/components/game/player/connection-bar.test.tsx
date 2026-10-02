import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/testing/reduced-motion";

import { ConnectionBar, type ConnectionTrouble } from "./connection-bar";

function renderBar(trouble: ConnectionTrouble, notice: string | null = null) {
	const onLeave = vi.fn();
	const onAnswer = vi.fn();
	const user = userEvent.setup();
	render(
		<>
			<button type="button" onClick={onAnswer}>
				Triângulo
			</button>
			<ConnectionBar trouble={trouble} notice={notice} onLeave={onLeave} />
		</>,
	);
	return { onLeave, onAnswer, user };
}

const bar = () => screen.getByRole("status");

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ConnectionBar (spec 013)", () => {
	it("tells the host disconnected", () => {
		renderBar("host");

		expect(bar()).toHaveTextContent("Conexão perdida");
		expect(bar()).toHaveTextContent("O anfitrião se desconectou");
		expect(bar()).not.toHaveTextContent("Tentando reconectar");
	});

	it("tells the device is reconnecting", () => {
		renderBar("device");

		expect(bar()).toHaveTextContent("Conexão perdida");
		expect(bar()).toHaveTextContent("Tentando reconectar…");
		expect(bar()).not.toHaveTextContent("O anfitrião se desconectou");
	});

	it("Sair leaves", async () => {
		const { onLeave, user } = renderBar("host");

		await user.click(screen.getByRole("button", { name: "Sair" }));

		expect(onLeave).toHaveBeenCalledTimes(1);
	});

	it("is a status, with Sair beside it", () => {
		renderBar("device");

		// The words are announced when they show; the button is not part of them.
		expect(within(bar()).queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sair" })).toBeEnabled();
	});

	it("the dark layer takes no touches", async () => {
		const { onAnswer, user } = renderBar("host");
		const dim = document.querySelector('[data-slot="connection-dim"]');

		expect(dim).toHaveClass("pointer-events-none");
		expect(dim).toHaveAttribute("aria-hidden", "true");
		// The answers behind it still work (RN-17).
		await user.click(screen.getByRole("button", { name: "Triângulo" }));
		expect(onAnswer).toHaveBeenCalledTimes(1);
	});

	it("with reduced motion the bar shows without animation and the indicator does not spin", () => {
		stubReducedMotion(true);
		renderBar("host");

		expect(bar()).toBeVisible();
		const indicator = document.querySelector(
			'[data-slot="connection-indicator"]',
		);
		expect(indicator).toHaveClass("motion-safe:animate-spin");
		expect(indicator).not.toHaveClass("animate-spin");
		expect(
			document.querySelector('[data-slot="connection-bar"]'),
		).toHaveAttribute("data-motion", "reduced");
	});

	it("comes in moving without reduced motion", () => {
		stubReducedMotion(false);
		renderBar("host");

		expect(
			document.querySelector('[data-slot="connection-bar"]'),
		).toHaveAttribute("data-motion", "full");
	});

	it("sits at the bottom edge, over the nickname, clear of the answers and Enviar", () => {
		renderBar("host");

		expect(document.querySelector('[data-slot="connection-bar"]')).toHaveClass(
			"bottom-2",
		);
	});

	it("shows the notice at the top, where the bar does not cover it", () => {
		renderBar("device", "Sua resposta não foi enviada.");

		const notice = screen.getByRole("alert");
		expect(notice).toHaveTextContent("Sua resposta não foi enviada.");
		expect(notice).toHaveClass("top-16");
	});

	it("has no notice to show without one, or without the bar", () => {
		renderBar("device");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("leaves the notice to the screen when there is no bar", () => {
		renderBar(null, "Sua resposta não foi enviada.");

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows nothing without a reason", () => {
		renderBar(null);

		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
		expect(document.querySelector('[data-slot="connection-dim"]')).toBeNull();
	});
});
