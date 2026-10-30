import {
	aReportGame,
	aReportQuestion,
} from "@quizio/core/reports/testing/a-report-game";
import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";
import { groupOf, publishedQuiz } from "../testing/fixtures";

const report = (gameId: string, header: Record<string, unknown> = {}) =>
	aReportGame({
		header: {
			gameId,
			ownerId: "ana",
			endedAt: new Date("2026-05-10T18:00:00.000Z"),
			...header,
		},
		questions: 2,
		players: ["Ana", "Bia"],
		answers: { Ana: ["right", "right"], Bia: ["right", "wrong"] },
	});

/**
 * As the screen gets it: dates as ISO strings. An agent reads a statement's
 * formatting as tags in the text instead (spec 047, RN-28).
 */
const asSent = (value: unknown) =>
	JSON.parse(JSON.stringify(value), (key, entry) =>
		key === "textFormatting" ? undefined : entry,
	);

async function withReports(...games: ReturnType<typeof aReportGame>[]) {
	const ana = await connectTestClient({ userId: "ana" });
	for (const game of games) {
		ana.api.reports.put(game);
	}
	return ana;
}

describe("report tools (spec 044, RN-28)", () => {
	it("get_report gives the same numbers as the report screen's query", async () => {
		const ana = await withReports(report("game-1"));

		const read = await ana.ok("get_report", { gameId: "game-1" });

		const screen = await ana.api
			.callerFor("ana")
			.report.get({ gameId: "game-1" });
		expect(read.report).toEqual(asSent(screen));
		expect(read.links).toEqual({
			report: "https://quizio.test/reports/game-1",
		});
		const listed = await ana.ok("list_reports", {});
		expect(listed).toMatchObject({
			total: 1,
			reports: [
				{
					gameId: "game-1",
					accuracyPercent: 75,
					participantCount: 2,
					link: "https://quizio.test/reports/game-1",
				},
			],
		});
	});

	it("get_report_detail reads a participant and a question", async () => {
		const ana = await withReports(report("game-1"));

		const bia = await ana.ok("get_report_detail", {
			gameId: "game-1",
			participantId: "player-Bia",
		});
		const second = await ana.ok("get_report_detail", {
			gameId: "game-1",
			questionPosition: 2,
		});

		expect(
			(bia.participant as { answers: { result: string }[] }).answers.map(
				({ result }) => result,
			),
		).toEqual(["correct", "wrong"]);
		expect(
			(second.question as { choices: { count: number }[] }).choices.map(
				({ count }) => count,
			),
		).toEqual([1, 1, 0, 0]);
		expect(
			(await ana.call("get_report_detail", { gameId: "game-1" })).data.error,
		).toMatchObject({ code: "INVALID_INPUT" });
	});

	it("get_report and get_report_detail return statements as markup (spec 047, RN-28)", async () => {
		const ana = await withReports(
			aReportGame({
				header: {
					gameId: "game-1",
					ownerId: "ana",
					endedAt: new Date("2026-05-10T18:00:00.000Z"),
				},
				questions: [
					aReportQuestion(0, {
						text: "H2O?",
						textFormatting: { subscript: [[1, 2]] },
					}),
				],
				players: ["Ana", "Bia"],
				answers: { Ana: ["wrong"], Bia: ["wrong"] },
			}),
		);
		const markup = "H<sub>2</sub>O?";

		const { report } = await ana.ok("get_report", { gameId: "game-1" });
		const { participant } = await ana.ok("get_report_detail", {
			gameId: "game-1",
			participantId: "player-Ana",
		});
		const { question } = await ana.ok("get_report_detail", {
			gameId: "game-1",
			questionPosition: 1,
		});

		expect(report).toMatchObject({
			questions: [{ text: markup }],
			summary: { hardestQuestion: { text: markup } },
		});
		expect(participant).toMatchObject({ answers: [{ text: markup }] });
		expect(question).toMatchObject({ text: markup });
		expect(JSON.stringify([report, participant, question])).not.toContain(
			"textFormatting",
		);
	});

	it("rename_report and set_reports_trashed", async () => {
		const ana = await withReports(report("game-1"), report("game-2"));

		expect(
			await ana.ok("rename_report", { gameId: "game-1", name: " Turma A " }),
		).toEqual({ name: "Turma A" });
		await ana.ok("set_reports_trashed", {
			gameIds: ["game-1", "game-2"],
			trashed: true,
		});
		await ana.ok("set_reports_trashed", {
			gameIds: ["game-2"],
			trashed: false,
		});

		const ids = async (section: "reports" | "trash") =>
			(
				(await ana.ok("list_reports", { section })).reports as {
					gameId: string;
				}[]
			).map(({ gameId }) => gameId);
		expect(await ids("trash")).toEqual(["game-1"]);
		expect(await ids("reports")).toEqual(["game-2"]);
	});

	it("an open assignment cannot go to the trash", async () => {
		const ana = await withReports(
			aReportGame({
				header: {
					gameId: "a-1",
					ownerId: "ana",
					mode: "assignment",
					status: "open",
					endedAt: null,
					deadline: new Date("2026-06-04T12:00:00.000Z"),
					pin: "04352236",
				},
				questions: 2,
				players: [],
				answers: {},
			}),
		);

		const refused = await ana.call("set_reports_trashed", {
			gameIds: ["a-1"],
			trashed: true,
		});

		expect(refused.data.error).toMatchObject({
			code: "REPORT.ASSIGNMENT_OPEN",
		});
	});

	it("delete_reports_permanently from the trash", async () => {
		const ana = await withReports(report("game-1"), report("game-2"));
		await ana.ok("set_reports_trashed", { gameIds: ["game-1"], trashed: true });

		const outOfTrash = await ana.call("delete_reports_permanently", {
			gameIds: ["game-2"],
		});
		expect(outOfTrash.data.error).toMatchObject({
			code: "REPORT.NOT_IN_TRASH",
		});

		await ana.ok("delete_reports_permanently", { gameIds: ["game-1"] });

		expect(
			(await ana.call("get_report", { gameId: "game-1" })).data.error,
		).toMatchObject({ code: "REPORT.NOT_FOUND" });
	});

	it("an admin reads a member's assignment report read-only", async () => {
		const bruno = await connectTestClient({ userId: "bruno" });
		const ana = await connectTestClient({ api: bruno.api, userId: "ana" });
		const groupId = await groupOf(ana.api, "ana", ["bruno"]);
		await ana.api.container.useCases.setGroupPermission({
			userId: "ana",
			groupId,
			permission: "membersCanAssign",
			value: true,
		});
		const quizId = await publishedQuiz(bruno);
		const { gameId } = (
			await bruno.ok("create_assignment", {
				quizId,
				deadline: "2026-06-04T12:00:00Z",
			})
		).assignment as { gameId: string };
		await bruno.ok("assign_to_groups", { gameId, groupIds: [groupId] });
		// The reports' fake does not read the games: put the report there.
		ana.api.reports.put(
			aReportGame({
				header: { gameId, ownerId: "bruno", mode: "assignment" },
				questions: 1,
				players: ["Lia"],
				answers: { Lia: ["right"] },
			}),
		);

		const read = await ana.ok("get_report", { gameId });

		expect(read.report).toMatchObject({ header: { readOnly: true } });
		expect(
			(await ana.call("rename_report", { gameId, name: "Meu" })).data.error,
		).toMatchObject({ code: "REPORT.NOT_FOUND" });
	});
});
