import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { ReportNotFoundError } from "../domain/report";
import { aReportGame } from "../testing/a-report-game";
import { InMemoryReportReadGrants } from "../testing/in-memory-report-read-grants";
import { InMemoryReportStore } from "../testing/in-memory-report-store";
import { createGetReport } from "./get-report";
import { createGetReportParticipant } from "./get-report-participant";
import { createGetReportQuestion } from "./get-report-question";
import { createListReports } from "./list-reports";
import { createRenameReport } from "./rename-report";

/** Bruno's report; Ana (a group's admin) may be granted reading it. */
function setup() {
	const store = new InMemoryReportStore([
		aReportGame({
			header: {
				gameId: "game-1",
				ownerId: "bruno",
				quizId: "quiz-1",
				quiz: {
					ownerId: "bruno",
					trashed: false,
					playable: true,
					coverImageKey: null,
				},
			},
			questions: 2,
			players: ["Lia"],
			answers: { Lia: ["right", "wrong"] },
		}),
	]);
	const grants = new InMemoryReportReadGrants();
	const deps = {
		reportGames: store,
		reports: store,
		reportReadGrants: grants,
		storage: new InMemoryObjectStorage(),
		clock: new FixedClock("2026-06-20T12:00:00.000Z"),
	};
	return { store, grants, deps };
}

describe("a report read by somebody else (spec 038, RN-20a)", () => {
	it("a granted reader gets the report read-only", async () => {
		const { grants, deps } = setup();
		grants.grant("ana", "game-1");

		const report = await createGetReport(deps)({
			ownerId: "ana",
			gameId: "game-1",
		});

		expect(report.header).toMatchObject({
			readOnly: true,
			canPlayAgain: false,
			quizId: null,
		});
		expect(report.participants).toHaveLength(1);
	});

	it("the owner still gets it with every action", async () => {
		const { deps } = setup();

		const report = await createGetReport(deps)({
			ownerId: "bruno",
			gameId: "game-1",
		});

		expect(report.header).toMatchObject({ readOnly: false, quizId: "quiz-1" });
	});

	it("without a grant, or with the report in the trash, it is REPORT.NOT_FOUND", async () => {
		const { grants, store, deps } = setup();
		const get = () =>
			createGetReport(deps)({ ownerId: "ana", gameId: "game-1" });

		await expect(get()).rejects.toThrow(ReportNotFoundError);
		grants.grant("ana", "game-1");
		await store.saveTrashed(["game-1"], new Date("2026-06-19T12:00:00.000Z"));
		await expect(get()).rejects.toThrow(ReportNotFoundError);
	});

	it("participant and question details follow the same rule", async () => {
		const { grants, deps } = setup();
		const participant = () =>
			createGetReportParticipant(deps)({
				ownerId: "ana",
				gameId: "game-1",
				playerId: "player-Lia",
			});
		const question = () =>
			createGetReportQuestion(deps)({
				ownerId: "ana",
				gameId: "game-1",
				questionIndex: 0,
			});

		await expect(participant()).rejects.toThrow(ReportNotFoundError);
		await expect(question()).rejects.toThrow(ReportNotFoundError);
		grants.grant("ana", "game-1");
		await expect(participant()).resolves.toBeTruthy();
		await expect(question()).resolves.toBeTruthy();
	});

	it("writes and the list stay the owner's even with a grant", async () => {
		const { grants, deps } = setup();
		grants.grant("ana", "game-1");

		await expect(
			createRenameReport(deps)({
				ownerId: "ana",
				gameId: "game-1",
				name: "Meu",
			}),
		).rejects.toThrow(ReportNotFoundError);
		const { items } = await createListReports(deps)({
			ownerId: "ana",
			section: "reports",
			limit: 20,
		});
		expect(items).toEqual([]);
	});
});
