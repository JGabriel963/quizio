import { describe, expect, it } from "vitest";

import type { AssignSettings } from "./group-assign-state";
import {
	canPublish,
	type GroupPostAction,
	type GroupPostState,
	groupPostReducer,
	initialGroupPostState,
	uploadToDiscard,
} from "./group-post-state";

const settings: AssignSettings = {
	deadline: new Date("2026-10-29T12:00:00.000Z"),
	options: {
		gameCharacters: false,
		questionTimer: true,
		randomizeAnswers: false,
	},
};
const quiz = { id: "quiz-1", title: "Capitais" };
const pdf = { type: "pdf" as const, name: "apostila.pdf", sizeBytes: 2048 };

const run = (...actions: GroupPostAction[]): GroupPostState =>
	actions.reduce(groupPostReducer, initialGroupPostState);

describe("groupPostReducer (spec 036)", () => {
	it("canPublish with text or an attachment, not while uploading (RN-06)", () => {
		expect(canPublish(run({ type: "open" }))).toBe(false);
		expect(
			canPublish(run({ type: "open" }, { type: "message", text: "  " })),
		).toBe(false);
		expect(
			canPublish(run({ type: "open" }, { type: "message", text: "Oi" })),
		).toBe(true);
		const uploading = run(
			{ type: "open" },
			{ type: "message", text: "Oi" },
			{ type: "startUpload", token: 1, file: pdf, previewUrl: null },
		);
		expect(canPublish(uploading)).toBe(false);
		const uploaded = groupPostReducer(uploading, {
			type: "uploaded",
			token: 1,
			key: "groups/g/a.pdf",
		});
		expect(canPublish({ ...uploaded, message: "" })).toBe(true);
		expect(uploaded.attachment).toEqual({
			kind: "file",
			...pdf,
			key: "groups/g/a.pdf",
			previewUrl: null,
		});
	});

	it("progress only moves the upload it names", () => {
		const state = run(
			{ type: "open" },
			{ type: "startUpload", token: 2, file: pdf, previewUrl: null },
			{ type: "progress", token: 1, fraction: 0.9 },
			{ type: "progress", token: 2, fraction: 0.5 },
		);
		expect(state.attachment).toMatchObject({
			kind: "uploading",
			progress: 0.5,
		});
		// A late answer of an upload already removed changes nothing.
		const removed = groupPostReducer(state, { type: "removeAttachment" });
		expect(
			groupPostReducer(removed, { type: "uploaded", token: 2, key: "k" })
				.attachment,
		).toEqual({ kind: "none" });
	});

	it("one attachment: the bar comes back after X, the text stays (RN-07)", () => {
		const state = run(
			{ type: "open" },
			{ type: "message", text: "Leiam" },
			{ type: "startUpload", token: 1, file: pdf, previewUrl: null },
			{ type: "uploaded", token: 1, key: "k" },
			{ type: "removeAttachment" },
		);
		expect(state.attachment).toEqual({ kind: "none" });
		expect(state.message).toBe("Leiam");
	});

	it("Atribuir kahoot: select → configure → back with the quiz (RN-12, RN-13)", () => {
		const state = run(
			{ type: "open" },
			{ type: "message", text: "Revisem" },
			{ type: "chooseQuiz" },
		);
		expect(state.step).toBe("select");
		const configuring = groupPostReducer(state, { type: "pickQuiz", quiz });
		expect(configuring.step).toBe("configure");
		const back = groupPostReducer(configuring, {
			type: "addToPost",
			...settings,
		});
		expect(back).toMatchObject({
			step: "compose",
			message: "Revisem",
			attachment: { kind: "quiz", quiz, settings },
		});
	});

	it("Fechar and Cancelar go back to compose without attachment (RN-13)", () => {
		for (const at of [
			run(
				{ type: "open" },
				{ type: "message", text: "Oi" },
				{ type: "chooseQuiz" },
			),
			run(
				{ type: "open" },
				{ type: "message", text: "Oi" },
				{ type: "chooseQuiz" },
				{ type: "pickQuiz", quiz },
			),
		]) {
			expect(groupPostReducer(at, { type: "backToCompose" })).toMatchObject({
				step: "compose",
				message: "Oi",
				attachment: { kind: "none" },
			});
		}
	});

	it("an upload failure brings the bar back with its message; a refused file too", () => {
		const failed = run(
			{ type: "open" },
			{ type: "startUpload", token: 1, file: pdf, previewUrl: null },
			{
				type: "uploadFailed",
				token: 1,
				error: "Não foi possível enviar o arquivo.",
			},
		);
		expect(failed).toMatchObject({
			attachment: { kind: "none" },
			error: "Não foi possível enviar o arquivo.",
		});
		const refused = run(
			{ type: "open" },
			{ type: "fileRefused", error: "Use um arquivo PDF." },
		);
		expect(refused.error).toBe("Use um arquivo PDF.");
		expect(
			groupPostReducer(refused, { type: "message", text: "a" }).error,
		).toBe(null);
	});

	it("names the upload to discard when the file is removed or the dialog closes (RN-08)", () => {
		const withFile = run(
			{ type: "open" },
			{ type: "startUpload", token: 1, file: pdf, previewUrl: null },
			{ type: "uploaded", token: 1, key: "groups/g/a.pdf" },
		);
		expect(uploadToDiscard(withFile)).toBe("groups/g/a.pdf");
		expect(uploadToDiscard(run({ type: "open" }))).toBeNull();
		expect(groupPostReducer(withFile, { type: "close" })).toEqual(
			initialGroupPostState,
		);
	});
});
