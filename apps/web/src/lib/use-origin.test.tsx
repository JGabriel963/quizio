import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameUnavailable } from "@/components/game/host/game-unavailable";

import { useOrigin } from "./use-origin";

function Probe() {
	const origin = useOrigin();
	return <p>{origin ?? "unknown"}</p>;
}

/** The loading screen of `/host/$gameId`, as the route renders it. */
function LoadingHost() {
	return <GameUnavailable state={{ kind: "loading", origin: useOrigin() }} />;
}

let container: HTMLDivElement | null = null;

/** Renders on the "server", then hydrates that HTML; returns what React complained about. */
async function hydrate(ui: React.ReactElement) {
	const html = renderToString(ui);
	container = document.createElement("div");
	container.innerHTML = html;
	document.body.append(container);
	const errors: unknown[] = [];
	const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	await act(async () => {
		hydrateRoot(container as HTMLDivElement, ui, {
			onRecoverableError: (error) => errors.push(error),
		});
	});
	const logged = consoleError.mock.calls.length;
	consoleError.mockRestore();
	return { html, errors, logged, container };
}

afterEach(() => {
	container?.remove();
	container = null;
});

describe("useOrigin", () => {
	it("is unknown on the server and the page's origin after hydration", async () => {
		const { html, errors, logged, container } = await hydrate(<Probe />);

		expect(html).toContain("unknown");
		expect(container.textContent).toBe(window.location.origin);
		expect(errors).toEqual([]);
		expect(logged).toBe(0);
	});

	it("the host's loading screen hydrates without a mismatch", async () => {
		const { html, errors, logged, container } = await hydrate(<LoadingHost />);

		// The server does not know the address, so it does not make one up.
		expect(html).not.toContain("/join");
		expect(container.textContent).toContain(`${window.location.host}/join`);
		expect(errors).toEqual([]);
		expect(logged).toBe(0);
	});
});
