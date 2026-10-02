import { describe, expect, it } from "vitest";

import {
	gameErrorMessage,
	SETTING_NOT_SAVED_MESSAGE,
	settingErrorMessage,
} from "./game-error-messages";

const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

describe("settingErrorMessage (spec 012)", () => {
	it("says the setting was not saved when the server is out of reach", () => {
		expect(settingErrorMessage(new TypeError("Failed to fetch"))).toBe(
			SETTING_NOT_SAVED_MESSAGE,
		);
		expect(SETTING_NOT_SAVED_MESSAGE).toBe(
			"Não foi possível salvar a configuração. Tente novamente.",
		);
	});

	it("tells why the server refused", () => {
		expect(settingErrorMessage(refusal("GAME.OPTIONS_FIXED"))).toBe(
			"A ordem aleatória só pode ser mudada antes de iniciar a partida.",
		);
		expect(settingErrorMessage(refusal("GAME.ENDED"))).toBe(
			"Esta partida foi encerrada.",
		);
	});
});

describe("gameErrorMessage", () => {
	it("no longer tells a game in progress apart for who joins (spec 012)", () => {
		expect(gameErrorMessage(refusal("GAME.LOCKED"))).toBe(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);
		expect(gameErrorMessage(refusal("GAME.ALREADY_STARTED"))).not.toBe(
			"Este jogo já começou.",
		);
	});
});
