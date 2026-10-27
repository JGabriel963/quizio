import { describe, expect, it } from "vitest";

import {
	type GroupAssignState,
	groupAssignReducer,
	initialGroupAssignState,
} from "./group-assign-state";

const capitais = { id: "quiz-1", title: "Capitais" };
const geografia = { id: "quiz-2", title: "Geografia" };
const settings = {
	deadline: new Date(2026, 9, 29, 12),
	options: {
		gameCharacters: true,
		questionTimer: true,
		randomizeAnswers: false,
	},
};

function run(...actions: Parameters<typeof groupAssignReducer>[1][]) {
	return actions.reduce<GroupAssignState>(
		groupAssignReducer,
		initialGroupAssignState,
	);
}

describe("the group's Atribuir flow (spec 038, RN-04 to RN-11)", () => {
	it("select → configure → message", () => {
		expect(run({ type: "open" }).step).toBe("select");
		expect(
			run({ type: "open" }, { type: "pick", quiz: capitais }),
		).toMatchObject({ step: "configure", quiz: capitais });
		expect(
			run(
				{ type: "open" },
				{ type: "pick", quiz: capitais },
				{ type: "addMessage", ...settings },
			),
		).toMatchObject({ step: "message", quiz: capitais, settings });
	});

	it("X goes back to select keeping deadline, options and text, then back to the message", () => {
		const state = run(
			{ type: "open" },
			{ type: "pick", quiz: capitais },
			{ type: "addMessage", ...settings },
			{ type: "message", text: "Revisem" },
			{ type: "removeQuiz" },
		);
		expect(state).toMatchObject({
			step: "select",
			settings,
			message: "Revisem",
		});

		expect(
			groupAssignReducer(state, { type: "pick", quiz: geografia }),
		).toMatchObject({
			step: "message",
			quiz: geografia,
			settings,
			message: "Revisem",
		});
	});

	it("cancel resets everything", () => {
		const state = run(
			{ type: "open" },
			{ type: "pick", quiz: capitais },
			{ type: "addMessage", ...settings },
			{ type: "message", text: "Revisem" },
			{ type: "close" },
		);

		expect(state).toEqual(initialGroupAssignState);
	});
});
