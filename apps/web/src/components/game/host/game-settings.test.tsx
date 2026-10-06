import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GameOptionsData } from "@/lib/api-types";

import { GameSettings } from "./game-settings";

const allOff: GameOptionsData = {
	showQuestionsOnDevices: false,
	randomizeQuestions: false,
	randomizeAnswers: false,
	autoplay: false,
};

const NAMES = [
	"Mostrar perguntas nos dispositivos",
	"Bloquear jogo",
	"Mostrar perguntas em ordem aleatória",
	"Mostrar respostas em ordem aleatória",
	"Reprodução automática",
];

function renderSettings(
	props: Partial<Parameters<typeof GameSettings>[0]> = {},
) {
	const handlers = {
		onOpenChange: vi.fn(),
		onOptionsChange: vi.fn(),
		onLockedChange: vi.fn(),
		onEnd: vi.fn(),
	};
	const user = userEvent.setup();
	render(
		<GameSettings
			open
			options={allOff}
			locked={false}
			playing={false}
			{...handlers}
			{...props}
		/>,
	);
	const panel = screen.getByRole("dialog", { name: "Configurações" });
	const switchOf = (name: string) =>
		within(panel).getByRole("switch", { name });
	return { ...handlers, user, panel, switchOf };
}

describe("GameSettings (spec 012)", () => {
	it("shows the five switches with their explanations and the footer", () => {
		const { panel } = renderSettings();

		expect(
			within(panel)
				.getAllByRole("switch")
				.map((control) => control.getAttribute("aria-labelledby"))
				.map((id) => document.getElementById(id ?? "")?.textContent),
		).toEqual(NAMES);
		for (const explanation of [
			"Perguntas e respostas são exibidas nos dispositivos dos participantes.",
			"Bloqueie o jogo para impedir que outros participantes entrem.",
			"As perguntas saem numa ordem sorteada a cada partida.",
			"As alternativas trocam de posição a cada partida.",
			"O jogo começa e avança pelas perguntas sozinho.",
		]) {
			expect(within(panel).getByText(explanation)).toBeInTheDocument();
		}
		expect(panel).toHaveTextContent(
			"Suas configurações serão salvas para a próxima vez.",
		);
	});

	it("every switch is off for a first game", () => {
		const { switchOf } = renderSettings();

		for (const name of NAMES) {
			expect(switchOf(name)).toHaveAttribute("aria-checked", "false");
		}
	});

	it("shows what the game has", () => {
		const { switchOf } = renderSettings({
			options: {
				...allOff,
				showQuestionsOnDevices: true,
				randomizeAnswers: true,
			},
		});

		expect(
			NAMES.map((name) => switchOf(name).getAttribute("aria-checked")),
		).toEqual(["true", "false", "false", "true", "false"]);
	});

	it("asks for the change at once", async () => {
		const { user, switchOf, onOptionsChange } = renderSettings({
			options: { ...allOff, randomizeQuestions: true },
		});

		await user.click(switchOf("Mostrar perguntas nos dispositivos"));
		await user.click(switchOf("Mostrar perguntas em ordem aleatória"));
		await user.click(switchOf("Mostrar respostas em ordem aleatória"));

		expect(onOptionsChange.mock.calls.map(([change]) => change)).toEqual([
			{ showQuestionsOnDevices: true },
			{ randomizeQuestions: false },
			{ randomizeAnswers: true },
		]);
	});

	it("the lock switch follows the game's lock", async () => {
		const { user, switchOf, onLockedChange, onOptionsChange } = renderSettings({
			locked: true,
		});
		const lock = switchOf("Bloquear jogo");

		expect(lock).toHaveAttribute("aria-checked", "true");
		await user.click(lock);

		expect(onLockedChange).toHaveBeenCalledExactlyOnceWith(false);
		// The lock is not one of the saved options (RN-06).
		expect(onOptionsChange).not.toHaveBeenCalled();
	});

	it("the random orders are disabled while the game is on, with the reason", async () => {
		const { user, panel, switchOf, onOptionsChange } = renderSettings({
			playing: true,
		});
		const questions = switchOf("Mostrar perguntas em ordem aleatória");
		const answers = switchOf("Mostrar respostas em ordem aleatória");

		for (const control of [questions, answers]) {
			expect(control).toHaveAttribute("aria-disabled", "true");
			expect(control).toHaveAccessibleDescription(
				/Só antes de iniciar a partida\./,
			);
		}
		expect(
			within(panel).getAllByText("Só antes de iniciar a partida."),
		).toHaveLength(2);

		await user.click(questions);
		expect(onOptionsChange).not.toHaveBeenCalled();
		// The other two still work during the game.
		expect(switchOf("Bloquear jogo")).not.toHaveAttribute("aria-disabled");
		await user.click(switchOf("Mostrar perguntas nos dispositivos"));
		expect(onOptionsChange).toHaveBeenCalledExactlyOnceWith({
			showQuestionsOnDevices: true,
		});
	});

	it("closes with the button", async () => {
		const { user, onOpenChange } = renderSettings();

		await user.click(screen.getByRole("button", { name: "Fechar" }));

		await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
		expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
	});

	it("is not there while closed", () => {
		renderSettingsClosed();

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

function renderSettingsClosed() {
	render(
		<GameSettings
			open={false}
			options={allOff}
			locked={false}
			playing={false}
			onOpenChange={() => {}}
			onOptionsChange={() => {}}
			onLockedChange={() => {}}
			onEnd={() => {}}
		/>,
	);
}

describe("GameSettings: Encerrar agora (spec 013)", () => {
	it("shows Encerrar jogo with Encerrar agora after the switches", () => {
		const { panel } = renderSettings();

		const row = within(panel).getByText("Encerrar jogo");
		const button = within(panel).getByRole("button", {
			name: "Encerrar agora",
		});
		const lastSwitch = within(panel).getAllByRole("switch").at(-1);
		const footer = within(panel).getByText(
			"Suas configurações serão salvas para a próxima vez.",
		);

		// After the switches, before the footer.
		expect(
			lastSwitch &&
				lastSwitch.compareDocumentPosition(row) &
					Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			button.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("asks before ending, and ends only when confirmed", async () => {
		const { user, panel, onEnd } = renderSettings({ playing: true });

		await user.click(
			within(panel).getByRole("button", { name: "Encerrar agora" }),
		);

		const dialog = screen.getByRole("alertdialog", {
			name: "Encerrar o jogo?",
		});
		expect(dialog).toHaveTextContent(
			"Os participantes serão desconectados e o PIN deixará de funcionar.",
		);
		expect(onEnd).not.toHaveBeenCalled();

		await user.click(within(dialog).getByRole("button", { name: "Encerrar" }));

		expect(onEnd).toHaveBeenCalledTimes(1);
	});

	it("cancelling goes back to the panel, which stays open", async () => {
		const { user, panel, onEnd, onOpenChange } = renderSettings();

		await user.click(
			within(panel).getByRole("button", { name: "Encerrar agora" }),
		);
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		await waitFor(() =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
		);
		expect(onEnd).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(
			screen.getByRole("dialog", { name: "Configurações" }),
		).toBeInTheDocument();
	});
});

describe("GameSettings: Reprodução automática (spec 014)", () => {
	const NAME = "Reprodução automática";

	it("shows Reprodução automática, off, before Encerrar jogo", () => {
		const { panel, switchOf } = renderSettings();
		const autoplay = switchOf(NAME);
		const answers = switchOf("Mostrar respostas em ordem aleatória");
		const end = within(panel).getByText("Encerrar jogo");

		expect(autoplay).toHaveAttribute("aria-checked", "false");
		expect(autoplay).toHaveAccessibleDescription(
			"O jogo começa e avança pelas perguntas sozinho.",
		);
		expect(
			answers.compareDocumentPosition(autoplay) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			autoplay.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("asks for the change at once", async () => {
		const { user, switchOf, onOptionsChange, onLockedChange } =
			renderSettings();

		await user.click(switchOf(NAME));

		expect(onOptionsChange).toHaveBeenCalledExactlyOnceWith({ autoplay: true });
		expect(onLockedChange).not.toHaveBeenCalled();
	});

	it("shows it on and turns it off", async () => {
		const { user, switchOf, onOptionsChange } = renderSettings({
			options: { ...allOff, autoplay: true },
		});

		expect(switchOf(NAME)).toHaveAttribute("aria-checked", "true");
		await user.click(switchOf(NAME));

		expect(onOptionsChange).toHaveBeenCalledExactlyOnceWith({
			autoplay: false,
		});
	});

	it("is free during the game", async () => {
		const { user, switchOf, onOptionsChange } = renderSettings({
			playing: true,
		});

		expect(switchOf(NAME)).not.toHaveAttribute("aria-disabled", "true");
		await user.click(switchOf(NAME));

		expect(onOptionsChange).toHaveBeenCalledExactlyOnceWith({ autoplay: true });
	});
});
