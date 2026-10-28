import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineTool } from "./define-tool";
import { connectTestClient } from "./testing/connect-test-client";

const probeTools = [
	defineTool({
		name: "read_probe",
		title: "Read probe",
		description: "Reads.",
		kind: "read",
		input: z.object({}),
		run: async () => ({ ok: true, at: new Date("2026-10-28T12:00:00.000Z") }),
	}),
	defineTool({
		name: "write_probe",
		title: "Write probe",
		description: "Writes.",
		kind: "write",
		input: z.object({}),
		run: async () => ({ ok: true }),
	}),
	defineTool({
		name: "idempotent_probe",
		title: "Idempotent probe",
		description: "Writes the same again.",
		kind: "idempotent",
		input: z.object({}),
		run: async () => ({ ok: true }),
	}),
	defineTool({
		name: "destructive_probe",
		title: "Destructive probe",
		description: "Deletes.",
		kind: "destructive",
		input: z.object({ quizId: z.string() }),
		run: async ({ quizId }, { useCases, identity }) =>
			useCases.deleteQuizPermanently({ ownerId: identity.userId, quizId }),
	}),
	defineTool({
		name: "crash_probe",
		title: "Crash probe",
		description: "Breaks.",
		kind: "read",
		input: z.object({}),
		run: async () => {
			throw new Error("database password is hunter2");
		},
	}),
];

/** The plan's table of tools (plan 044, "Ferramentas"), both stages: read, write, idempotent, destructive. */
const EXPECTED_KINDS = {
	get_account: "read",
	rename_account: "idempotent",
	get_creator_profile: "read",
	list_quizzes: "read",
	get_others_quiz: "read",
	create_quiz: "write",
	get_quiz: "read",
	update_quiz: "idempotent",
	duplicate_quiz: "write",
	set_quiz_trashed: "idempotent",
	delete_quiz_permanently: "destructive",
	publish_quiz: "write",
	discard_quiz_changes: "destructive",
	add_questions: "write",
	update_question: "idempotent",
	duplicate_question: "write",
	move_question: "idempotent",
	delete_question: "destructive",
	set_time_limit_for_all: "idempotent",
	request_upload: "write",
	list_themes: "read",
	create_custom_theme: "write",
	update_custom_theme: "idempotent",
	delete_custom_theme: "destructive",
	host_live_game: "write",
	get_live_game: "read",
	update_live_game: "idempotent",
	remove_player: "destructive",
	end_live_game: "destructive",
	create_assignment: "write",
	change_assignment_deadline: "idempotent",
	end_assignment: "destructive",
	assign_to_groups: "write",
	list_reports: "read",
	get_report: "read",
	get_report_detail: "read",
	rename_report: "idempotent",
	set_reports_trashed: "idempotent",
	delete_reports_permanently: "destructive",
	list_groups: "read",
	create_group: "write",
	get_group: "read",
	update_group: "idempotent",
	reset_group_invite: "destructive",
	accept_group_invite: "idempotent",
	list_group_members: "read",
	remove_group_member: "destructive",
	leave_group: "destructive",
	delete_group: "destructive",
	list_group_feed: "read",
	get_group_post: "read",
	create_group_post: "write",
	set_post_like: "idempotent",
	delete_group_post: "destructive",
	share_quizzes_with_group: "write",
	unshare_quiz_from_group: "destructive",
	list_group_shared_quizzes: "read",
	list_group_assignments: "read",
	list_notifications: "read",
	mark_notifications_read: "idempotent",
} as const;

function kindOf(annotations: {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
}) {
	if (annotations.readOnlyHint) {
		return "read";
	}
	if (annotations.destructiveHint) {
		return "destructive";
	}
	return annotations.idempotentHint ? "idempotent" : "write";
}

describe("the Quizio tools (spec 044, RN-08, RN-32; CA-26, CA-27)", () => {
	it("lists the 60 tools with the expected kind each", async () => {
		const { client } = await connectTestClient();

		const { tools } = await client.listTools();

		expect(tools).toHaveLength(60);
		expect(
			Object.fromEntries(
				tools.map((tool) => [tool.name, kindOf(tool.annotations ?? {})]),
			),
		).toEqual(EXPECTED_KINDS);
		for (const tool of tools) {
			expect(tool.description?.length, tool.name).toBeGreaterThan(20);
			expect(tool.annotations?.openWorldHint, tool.name).toBe(false);
		}
	});

	it("still offers none of the screen-only actions", async () => {
		const { client } = await connectTestClient();

		const names = (await client.listTools()).tools.map((tool) => tool.name);

		for (const forbidden of [
			/delete_account/,
			/password/,
			/photo/,
			/access_key|connection|disconnect/,
			/join/,
			/start_game|advance|start_live_game/,
			/review/,
			/generate_questions/,
		]) {
			expect(
				names.filter((name) => forbidden.test(name)),
				String(forbidden),
			).toEqual([]);
		}
	});
});

describe("createQuizioMcpServer (spec 044, RN-10, RN-11, RN-32)", () => {
	it("initialize returns Quizio's instructions", async () => {
		const { client } = await connectTestClient({ tools: probeTools });

		expect(client.getInstructions()).toContain("Quizio");
		expect(client.getInstructions()).toMatch(/confirm/i);
		// The flows of every area, the live game's limit among them (RN-26).
		for (const tool of [
			"host_live_game",
			"create_assignment",
			"get_report",
			"create_group_post",
			"list_notifications",
		]) {
			expect(client.getInstructions()).toContain(tool);
		}
	});

	it("a read tool is read-only, a write tool is not destructive and a destructive one says so", async () => {
		const { client } = await connectTestClient({ tools: probeTools });

		const { tools } = await client.listTools();
		const annotations = Object.fromEntries(
			tools.map((tool) => [tool.name, tool.annotations]),
		);

		expect(annotations.read_probe).toMatchObject({ readOnlyHint: true });
		expect(annotations.write_probe).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
		});
		expect(annotations.idempotent_probe).toMatchObject({
			destructiveHint: false,
			idempotentHint: true,
		});
		expect(annotations.destructive_probe).toMatchObject({
			readOnlyHint: false,
			destructiveHint: true,
		});
		expect(tools.find((tool) => tool.name === "read_probe")?.title).toBe(
			"Read probe",
		);
	});

	it("a result comes back as structured content and as JSON text, dates in ISO", async () => {
		const { call } = await connectTestClient({ tools: probeTools });

		const result = await call("read_probe");

		expect(result.isError).toBe(false);
		expect(result.data).toEqual({ ok: true, at: "2026-10-28T12:00:00.000Z" });
		expect(JSON.parse(result.text)).toEqual(result.data);
	});

	it("a domain error comes back as isError with its code and message", async () => {
		const { call } = await connectTestClient({ tools: probeTools });

		const result = await call("destructive_probe", { quizId: "missing" });

		expect(result.isError).toBe(true);
		expect(result.data).toEqual({
			error: { code: "QUIZ.NOT_FOUND", message: expect.any(String) },
		});
	});

	it("a not found error looks the same whether the thing is missing or someone else's", async () => {
		const { api, call } = await connectTestClient({
			tools: probeTools,
			userId: "ana",
		});
		const theirs = await api.callerFor("bruno").quiz.create({});

		const missing = await call("destructive_probe", { quizId: "missing" });
		const someoneElses = await call("destructive_probe", { quizId: theirs.id });

		expect(someoneElses.data).toEqual(missing.data);
	});

	it("an unexpected error comes back as INTERNAL without details", async () => {
		const reported: Error[] = [];
		const { call } = await connectTestClient({
			tools: probeTools,
			onError: (error) => reported.push(error),
		});

		const result = await call("crash_probe");

		expect(result.isError).toBe(true);
		expect(result.data).toEqual({
			error: { code: "INTERNAL", message: expect.any(String) },
		});
		expect(result.text).not.toContain("hunter2");
		expect(reported).toHaveLength(1);
	});
});
