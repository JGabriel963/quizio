import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import {
	InvalidReportNameError,
	ReportInTrashError,
	ReportNotFoundError,
	ReportNotInTrashError,
} from "../domain/report";
import { aReportGame } from "../testing/a-report-game";
import { InMemoryReportStore } from "../testing/in-memory-report-store";
import { createDeleteReportsPermanently } from "./delete-reports-permanently";
import { createListReports } from "./list-reports";
import { createMoveReportsToTrash } from "./move-reports-to-trash";
import { createRenameReport } from "./rename-report";
import { createRestoreReports } from "./restore-reports";

const day = (n: number) =>
	new Date(`2026-06-${String(n).padStart(2, "0")}T18:00:00.000Z`);

const report = (gameId: string, header: Record<string, unknown> = {}) =>
	aReportGame({
		header: { gameId, ...header },
		questions: 1,
		players: ["Ana"],
		answers: { Ana: ["right"] },
	});

function setup(...games: ReturnType<typeof aReportGame>[]) {
	const store = new InMemoryReportStore(games);
	const clock = new FixedClock("2026-06-20T12:00:00.000Z");
	const deps = { reportGames: store, reports: store, clock };
	const listReports = createListReports({
		...deps,
		storage: new InMemoryObjectStorage(),
	});
	const names = (section: "reports" | "trash") =>
		listReports({ ownerId: "user-1", section, limit: 50 }).then(({ items }) =>
			items.map(({ gameId, name }) => `${gameId}:${name}`),
		);
	return {
		store,
		clock,
		names,
		rename: createRenameReport(deps),
		trash: createMoveReportsToTrash(deps),
		restore: createRestoreReports(deps),
		deleteForGood: createDeleteReportsPermanently(deps),
	};
}

describe("renameReport (spec 015)", () => {
	it("renaming changes the report's name only", async () => {
		const { rename, names } = setup(report("game-1"));

		const renamed = await rename({
			ownerId: "user-1",
			gameId: "game-1",
			name: "  Capitais — Turma A ",
		});

		expect(renamed).toEqual({ name: "Capitais — Turma A" });
		expect(await names("reports")).toEqual(["game-1:Capitais — Turma A"]);
	});

	it("another report of the same quiz keeps its name", async () => {
		const { rename, names } = setup(
			report("game-1", { endedAt: day(12) }),
			report("game-2", { endedAt: day(13) }),
		);

		await rename({ ownerId: "user-1", gameId: "game-2", name: "Turma B" });

		expect(await names("reports")).toEqual([
			"game-2:Turma B",
			"game-1:Capitais",
		]);
	});

	it("rejects an invalid name", async () => {
		const { rename, names } = setup(report("game-1"));

		for (const name of ["", "   ", "a".repeat(96)]) {
			await expect(
				rename({ ownerId: "user-1", gameId: "game-1", name }),
			).rejects.toBeInstanceOf(InvalidReportNameError);
		}
		expect(await names("reports")).toEqual(["game-1:Capitais"]);
	});

	it("a trashed report cannot be renamed", async () => {
		const { rename } = setup(report("game-1", { trashedAt: day(15) }));

		await expect(
			rename({ ownerId: "user-1", gameId: "game-1", name: "Turma A" }),
		).rejects.toBeInstanceOf(ReportInTrashError);
	});

	it("another creator's report is not found", async () => {
		const { rename } = setup(report("game-1"));

		await expect(
			rename({ ownerId: "user-2", gameId: "game-1", name: "Meu" }),
		).rejects.toBeInstanceOf(ReportNotFoundError);
	});
});

describe("the reports' trash (spec 015)", () => {
	it("a trashed report leaves the list and shows in the trash", async () => {
		const { trash, names, store, clock } = setup(
			report("game-1", { endedAt: day(12) }),
			report("game-2", { endedAt: day(13) }),
		);

		await trash({ ownerId: "user-1", gameIds: ["game-1"] });

		expect(await names("reports")).toEqual(["game-2:Capitais"]);
		expect(await names("trash")).toEqual(["game-1:Capitais"]);
		expect((await store.findHeader("game-1", clock.now()))?.trashedAt).toEqual(
			clock.now(),
		);
	});

	it("moves several at once", async () => {
		const { trash, names } = setup(
			report("game-1", { endedAt: day(11) }),
			report("game-2", { endedAt: day(12) }),
			report("game-3", { endedAt: day(13) }),
		);

		await trash({ ownerId: "user-1", gameIds: ["game-1", "game-3"] });

		expect(await names("reports")).toEqual(["game-2:Capitais"]);
		expect(await names("trash")).toHaveLength(2);
	});

	it("one foreign report fails them all and changes nothing", async () => {
		const { trash, names } = setup(
			report("game-1"),
			report("game-2", { ownerId: "user-2" }),
		);

		await expect(
			trash({ ownerId: "user-1", gameIds: ["game-1", "game-2"] }),
		).rejects.toBeInstanceOf(ReportNotFoundError);
		await expect(
			trash({ ownerId: "user-1", gameIds: ["game-1", "game-9"] }),
		).rejects.toBeInstanceOf(ReportNotFoundError);
		expect(await names("reports")).toEqual(["game-1:Capitais"]);
	});

	it("trashing twice keeps the first instant", async () => {
		const { trash, store, clock } = setup(report("game-1"));
		const first = clock.now();

		await trash({ ownerId: "user-1", gameIds: ["game-1"] });
		clock.advanceBy(60_000);
		await trash({ ownerId: "user-1", gameIds: ["game-1"] });

		expect((await store.findHeader("game-1", clock.now()))?.trashedAt).toEqual(
			first,
		);
	});

	it("restoring puts it back", async () => {
		const { restore, names } = setup(
			report("game-1", { endedAt: day(12), trashedAt: day(15) }),
			report("game-2", { endedAt: day(13) }),
		);

		// Restoring what is not in the trash is harmless.
		await restore({ ownerId: "user-1", gameIds: ["game-1", "game-2"] });

		expect(await names("reports")).toEqual([
			"game-2:Capitais",
			"game-1:Capitais",
		]);
		expect(await names("trash")).toEqual([]);
	});

	it("deleting for good needs the trash", async () => {
		const { deleteForGood, names } = setup(
			report("game-1", { trashedAt: day(15) }),
			report("game-2"),
		);

		await expect(
			deleteForGood({ ownerId: "user-1", gameIds: ["game-1", "game-2"] }),
		).rejects.toBeInstanceOf(ReportNotInTrashError);
		// Nothing was deleted.
		expect(await names("trash")).toEqual(["game-1:Capitais"]);
	});

	it("deleting removes the game", async () => {
		const { deleteForGood, names, store, clock } = setup(
			report("game-1", { trashedAt: day(15) }),
			report("game-2"),
		);

		await deleteForGood({ ownerId: "user-1", gameIds: ["game-1"] });

		expect(await names("trash")).toEqual([]);
		expect(await names("reports")).toEqual(["game-2:Capitais"]);
		expect(await store.findGame("game-1", clock.now())).toBeNull();
	});

	it("another creator cannot restore or delete", async () => {
		const { restore, deleteForGood } = setup(
			report("game-1", { trashedAt: day(15) }),
		);

		await expect(
			restore({ ownerId: "user-2", gameIds: ["game-1"] }),
		).rejects.toBeInstanceOf(ReportNotFoundError);
		await expect(
			deleteForGood({ ownerId: "user-2", gameIds: ["game-1"] }),
		).rejects.toBeInstanceOf(ReportNotFoundError);
	});
});
