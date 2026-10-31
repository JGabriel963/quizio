import { describe, expect, it } from "vitest";

import { aReportQuestion } from "../testing/a-report-game";
import { questionRow } from "./report-view";

describe("questionRow", () => {
	it("a question row carries the formatting (spec 047, RN-25)", () => {
		const question = aReportQuestion(0, {
			text: "Quanto é 22?",
			textFormatting: { superscript: [[10, 11]] },
		});

		const row = questionRow(question, {
			index: 0,
			accuracy: { correct: 1, total: 4 },
			unanswered: 0,
			averageResponseTimeMs: null,
			choiceCounts: [],
		});

		expect(row).toMatchObject({
			text: "Quanto é 22?",
			textFormatting: { superscript: [[10, 11]] },
			difficult: true,
		});
	});
});
