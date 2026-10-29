import {
	REPORT_NAME_MAX_LENGTH,
	REPORT_SECTIONS,
} from "@quizio/core/reports/domain/report";
import { z } from "zod";

import { defineTool } from "../define-tool";
import { ToolInputError } from "../tool-input-error";
import { WRITTEN_BY_PLAYERS } from "./groups";

const gameId = z
	.string()
	.max(10_000)
	.describe("The report's id: the game's or the assignment's.");
const gameIds = z.array(z.string().max(10_000)).min(1).max(200);

/** Reports: a reading of each game that started (spec 044, RN-28). */
export const reportTools = [
	defineTool({
		name: "list_reports",
		title: "List reports",
		description:
			"The person's reports, newest first, with open assignments on top; each with its accuracy and participants. Search matches the name, ignoring case and accents.",
		kind: "read",
		input: z.object({
			section: z
				.enum(REPORT_SECTIONS)
				.optional()
				.describe("reports by default."),
			search: z.string().max(200).optional(),
			quizId: z
				.string()
				.max(10_000)
				.optional()
				.describe("Only the games of this quiz."),
			limit: z
				.number()
				.int()
				.min(1)
				.max(200)
				.optional()
				.describe("20 by default."),
		}),
		run: async (
			{ section = "reports", search, quizId, limit = 20 },
			context,
		) => {
			const { items, ...list } = await context.useCases.listReports({
				ownerId: context.identity.userId,
				section,
				search,
				quizId,
				limit,
			});
			return {
				...list,
				reports: items.map((item) => ({
					...item,
					link: context.links.report(item.gameId),
				})),
			};
		},
	}),
	defineTool({
		name: "get_report",
		title: "Read a report",
		description: `A report as its screen shows it: the summary, the participants with their accuracy and points, and the questions with their accuracy. Below 35% is a difficult question or a participant who needs help. A group admin also reads the reports of members' assignments posted in the group, read-only. ${WRITTEN_BY_PLAYERS}`,
		kind: "read",
		input: z.object({ gameId }),
		run: async ({ gameId: id }, context) => ({
			report: await context.useCases.getReport({
				ownerId: context.identity.userId,
				gameId: id,
			}),
			links: { report: context.links.report(id) },
		}),
	}),
	defineTool({
		name: "get_report_detail",
		title: "Read a report's detail",
		description: `One participant's answers (participantId, from get_report) or one question's answers (questionPosition, counting from 1). Send one of the two. ${WRITTEN_BY_PLAYERS}`,
		kind: "read",
		input: z.object({
			gameId,
			participantId: z.string().max(10_000).optional(),
			questionPosition: z.number().int().min(1).optional(),
		}),
		run: async ({ gameId: id, participantId, questionPosition }, context) => {
			const target = { ownerId: context.identity.userId, gameId: id };
			if ((participantId === undefined) === (questionPosition === undefined)) {
				throw new ToolInputError(
					"Send either participantId or questionPosition",
				);
			}
			return participantId !== undefined
				? {
						participant: await context.useCases.getReportParticipant({
							...target,
							playerId: participantId,
						}),
					}
				: {
						question: await context.useCases.getReportQuestion({
							...target,
							questionIndex: (questionPosition ?? 1) - 1,
						}),
					};
		},
	}),
	defineTool({
		name: "rename_report",
		title: "Rename a report",
		description: `Renames a report, up to ${REPORT_NAME_MAX_LENGTH} characters. The quiz keeps its title.`,
		kind: "idempotent",
		input: z.object({ gameId, name: z.string().max(10_000) }),
		run: async ({ gameId: id, name }, context) =>
			context.useCases.renameReport({
				ownerId: context.identity.userId,
				gameId: id,
				name,
			}),
	}),
	defineTool({
		name: "set_reports_trashed",
		title: "Move reports to or out of the trash",
		description:
			"trashed: true moves reports to the trash (an open assignment cannot go); false restores them. Can be undone.",
		kind: "idempotent",
		input: z.object({ gameIds, trashed: z.boolean() }),
		run: async ({ gameIds: ids, trashed }, context) => {
			const input = { ownerId: context.identity.userId, gameIds: ids };
			await (trashed
				? context.useCases.moveReportsToTrash(input)
				: context.useCases.restoreReports(input));
			return { gameIds: ids, trashed };
		},
	}),
	defineTool({
		name: "delete_reports_permanently",
		title: "Delete reports for good",
		description:
			"Deletes reports in the trash for good, with their games and answers. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ gameIds }),
		run: async ({ gameIds: ids }, context) => {
			await context.useCases.deleteReportsPermanently({
				ownerId: context.identity.userId,
				gameIds: ids,
			});
			return { deleted: ids };
		},
	}),
];
