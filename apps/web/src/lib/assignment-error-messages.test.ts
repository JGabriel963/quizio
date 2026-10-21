import { describe, expect, it } from "vitest";

import {
	ASSIGNMENT_OPEN_TRASH_HINT,
	assignmentErrorMessage,
	isDeadlineRefusal,
} from "./assignment-error-messages";
import { reportErrorMessage } from "./report-error-messages";

const refusal = (domainCode: string) =>
	Object.assign(new Error(domainCode), { data: { domainCode } });

describe("assignment error messages (spec 029)", () => {
	it("tells why a deadline was refused", () => {
		expect(assignmentErrorMessage(refusal("ASSIGNMENT.DEADLINE_PASSED"))).toBe(
			"Esse prazo já passou. Escolha outro.",
		);
		expect(assignmentErrorMessage(refusal("ASSIGNMENT.DEADLINE_TOO_FAR"))).toBe(
			"O prazo pode ser de no máximo 28 dias a partir de agora.",
		);
		expect(isDeadlineRefusal(refusal("ASSIGNMENT.DEADLINE_PASSED"))).toBe(true);
		expect(isDeadlineRefusal(refusal("GAME.ENDED"))).toBe(false);
	});

	it("says an ended assignment was ended, and other refusals as the game does", () => {
		expect(assignmentErrorMessage(refusal("GAME.ENDED"))).toBe(
			"Esta atribuição já foi encerrada.",
		);
		expect(assignmentErrorMessage(refusal("GAME.QUIZ_NOT_PLAYABLE"))).toBe(
			"Salve o quiz no editor para poder jogar.",
		);
	});

	it("falls back to the given text", () => {
		expect(
			assignmentErrorMessage(new TypeError("Failed to fetch"), "Não deu."),
		).toBe("Não deu.");
	});

	it("an open assignment cannot go to the trash", () => {
		expect(reportErrorMessage(refusal("REPORT.ASSIGNMENT_OPEN"))).toBe(
			ASSIGNMENT_OPEN_TRASH_HINT,
		);
		expect(ASSIGNMENT_OPEN_TRASH_HINT).toBe(
			"Encerre a atribuição para mover o relatório para a lixeira.",
		);
	});
});
