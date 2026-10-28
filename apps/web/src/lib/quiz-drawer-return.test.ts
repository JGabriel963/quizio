import { describe, expect, it } from "vitest";

import { drawerBehindPage } from "./quiz-drawer-return";

const quizId = "quiz-1";
const page = "http://localhost:3001/quizzes/quiz-1";
const editor = "http://localhost:3001/creator/quiz-1";
const fromLibrary = {
	__tempKey: "123",
	__tempLocation: {
		pathname: "/library",
		search: "?section=drafts&quiz=quiz-1",
	},
};

describe("drawerBehindPage", () => {
	it("going back to a drawer from another document opens the drawer again", () => {
		expect(
			drawerBehindPage({
				state: fromLibrary,
				quizId,
				documentUrl: editor,
				currentUrl: page,
			}),
		).toEqual({
			to: "/library",
			search: { section: "drafts", quiz: "quiz-1" },
		});
	});

	it("the dashboard's drawer comes back too", () => {
		expect(
			drawerBehindPage({
				state: { __tempLocation: { pathname: "/", search: "?quiz=quiz-1" } },
				quizId,
				documentUrl: editor,
				currentUrl: page,
			}),
		).toEqual({ to: "/", search: { quiz: "quiz-1" } });
	});

	it("reloading the page itself keeps the page", () => {
		expect(
			drawerBehindPage({
				state: fromLibrary,
				quizId,
				documentUrl: page,
				currentUrl: page,
			}),
		).toBeNull();
	});

	it("a page opened by a link has no drawer behind it", () => {
		expect(
			drawerBehindPage({
				state: { __TSR_index: 3 },
				quizId,
				documentUrl: editor,
				currentUrl: page,
			}),
		).toBeNull();
	});

	it("a drawer of another quiz, or over another screen, is not this page's", () => {
		const other = (pathname: string, quiz: string) => ({
			__tempLocation: { pathname, search: `?quiz=${quiz}` },
		});

		for (const state of [
			other("/library", "quiz-2"),
			other("/reports", "quiz-1"),
			null,
		]) {
			expect(
				drawerBehindPage({
					state,
					quizId,
					documentUrl: editor,
					currentUrl: page,
				}),
			).toBeNull();
		}
	});
});
