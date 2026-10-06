import { describe, expect, it } from "vitest";

import type { GamePhase } from "../../game/domain/game-progress";
import { aReportHeader } from "../testing/a-report-game";
import {
	assertInTrash,
	assertOutOfTrash,
	InvalidReportNameError,
	parseReportName,
	playedQuestionCount,
	REPORT_NAME_MAX_LENGTH,
	ReportInTrashError,
	ReportNotFoundError,
	ReportNotInTrashError,
	requireOwnedReport,
} from "./report";

describe("report header (spec 015)", () => {
	it("a finished game played every question", () => {
		expect(playedQuestionCount(aReportHeader({ questionCount: 15 }))).toBe(15);
	});

	it("an ended game counts only the questions that reached their results", () => {
		const endedAt = (questionIndex: number, phase: GamePhase) =>
			aReportHeader({
				questionCount: 5,
				outcome: "ended",
				stoppedAt: { questionIndex, phase },
			});

		expect(playedQuestionCount(endedAt(0, "gameIntro"))).toBe(0);
		expect(playedQuestionCount(endedAt(0, "answering"))).toBe(0);
		expect(playedQuestionCount(endedAt(2, "questionIntro"))).toBe(2);
		expect(playedQuestionCount(endedAt(2, "answering"))).toBe(2);
		expect(playedQuestionCount(endedAt(2, "results"))).toBe(3);
		expect(playedQuestionCount(endedAt(2, "scoreboard"))).toBe(3);
	});

	it("another owner's report is not found", () => {
		const header = aReportHeader({ ownerId: "user-1" });

		expect(requireOwnedReport(header, "user-1")).toBe(header);
		expect(() => requireOwnedReport(header, "user-2")).toThrow(
			ReportNotFoundError,
		);
		expect(() => requireOwnedReport(null, "user-1")).toThrow(
			ReportNotFoundError,
		);
	});

	it("a report in the trash cannot be opened", () => {
		const trashed = aReportHeader({ trashedAt: new Date() });

		expect(() => assertOutOfTrash(trashed)).toThrow(ReportInTrashError);
		expect(() => assertOutOfTrash(aReportHeader())).not.toThrow();
		expect(() => assertInTrash(aReportHeader())).toThrow(ReportNotInTrashError);
		expect(() => assertInTrash(trashed)).not.toThrow();
	});

	it("rejects an empty name and one with 96 characters", () => {
		expect(() => parseReportName("")).toThrow(InvalidReportNameError);
		expect(() => parseReportName("   ")).toThrow(InvalidReportNameError);
		expect(() => parseReportName("a".repeat(96))).toThrow(
			InvalidReportNameError,
		);
		expect(parseReportName("a".repeat(95))).toHaveLength(95);
		expect(REPORT_NAME_MAX_LENGTH).toBe(95);
	});

	it("trims the name and counts graphemes", () => {
		expect(parseReportName("  Capitais — Turma A ")).toBe("Capitais — Turma A");
		// 95 flags are 95 characters, though many more code units.
		expect(() => parseReportName("🇧🇷".repeat(95))).not.toThrow();
	});
});
