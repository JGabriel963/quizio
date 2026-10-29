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
	it("points a network out of attempts to the QR code and tells too many joins apart (spec 008, RN-39, RN-45a)", () => {
		expect(gameErrorMessage(refusal("GAME.TOO_MANY_PIN_ATTEMPTS"))).toBe(
			"Muitas tentativas. Aguarde um momento ou entre pelo QR code ou pelo link do jogo.",
		);
		expect(gameErrorMessage(refusal("GAME.TOO_MANY_JOINS"))).toBe(
			"Muitas entradas por esta rede agora. Aguarde um momento e tente de novo.",
		);
	});

	it("no longer tells a game in progress apart for who joins (spec 012)", () => {
		expect(gameErrorMessage(refusal("GAME.LOCKED"))).toBe(
			"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
		);
		expect(gameErrorMessage(refusal("GAME.ALREADY_STARTED"))).not.toBe(
			"Este jogo já começou.",
		);
	});
});
