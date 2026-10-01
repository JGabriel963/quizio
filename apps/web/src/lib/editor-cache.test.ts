import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { describe, expect, it } from "vitest";

import type { QuizEditorData } from "./api-types";
import {
	imageUrlOf,
	publishStateOf,
	selectionAfterRemoval,
	withImageUrl,
	withQuestionInserted,
	withQuestionMoved,
	withQuestionRemoved,
	withQuizPublished,
	withTimeLimitForAll,
} from "./editor-cache";

const question = (id: string) => ({ ...blankQuestion(id), text: id });

function editorWith(...ids: string[]): QuizEditorData {
	return {
		quiz: { questionCount: ids.length } as QuizEditorData["quiz"],
		questions: ids.map(question),
		publishedQuestions: null,
		imageUrls: {},
	};
}

const idsOf = (data: QuizEditorData) => data.questions.map(({ id }) => id);

describe("publish state of the cached editor", () => {
	it("a draft has no published questions", () => {
		expect(publishStateOf(editorWith("a"))).toBe("draft");
	});

	it("compares the questions with the playable version", () => {
		const published = {
			...editorWith("a", "b"),
			publishedQuestions: ["a", "b"].map(question),
		};

		expect(publishStateOf(published)).toBe("published");
		expect(publishStateOf(withQuestionMoved(published, "b", 0))).toBe(
			"unpublishedChanges",
		);
		expect(publishStateOf(withTimeLimitForAll(published, 45))).toBe(
			"unpublishedChanges",
		);
		expect(publishStateOf(withTimeLimitForAll(published, 20))).toBe(
			"published",
		);
	});

	it("publishing makes the current questions the playable version", () => {
		const data = withTimeLimitForAll(
			{ ...editorWith("a"), publishedQuestions: [question("a")] },
			45,
		);
		const quiz = { ...data.quiz, publishedVersion: 2 };

		const after = withQuizPublished(data, quiz);

		expect(after.quiz).toBe(quiz);
		expect(after.publishedQuestions).toEqual(data.questions);
		expect(publishStateOf(after)).toBe("published");
	});

	it("list changes keep the published questions", () => {
		const published = {
			...editorWith("a", "b"),
			publishedQuestions: ["a", "b"].map(question),
		};

		expect(withQuestionRemoved(published, "b").publishedQuestions).toEqual(
			published.publishedQuestions,
		);
	});
});

describe("editor cache", () => {
	it("sets every question's time limit", () => {
		const after = withTimeLimitForAll(editorWith("a", "b"), 45);

		expect(after.questions.map((item) => item.timeLimitSeconds)).toEqual([
			45, 45,
		]);
	});

	it("moves a question optimistically", () => {
		expect(idsOf(withQuestionMoved(editorWith("a", "b", "c"), "c", 0))).toEqual(
			["c", "a", "b"],
		);
	});

	it("removes a question optimistically, leaving the previous data for rollback", () => {
		const before = editorWith("a", "b", "c");

		const after = withQuestionRemoved(before, "b");

		expect(idsOf(after)).toEqual(["a", "c"]);
		expect(after.quiz.questionCount).toBe(2);
		expect(idsOf(before)).toEqual(["a", "b", "c"]);
	});

	it("inserts a question at its index and counts it", () => {
		const after = withQuestionInserted(editorWith("a", "c"), question("b"), 1);

		expect(idsOf(after)).toEqual(["a", "b", "c"]);
		expect(after.quiz.questionCount).toBe(3);
	});

	it("inserting a question already listed changes nothing", () => {
		const before = editorWith("a", "b");

		expect(withQuestionInserted(before, question("b"), 0)).toBe(before);
	});

	it("selects the next question after removal", () => {
		const remaining = editorWith("a", "c").questions;

		expect(selectionAfterRemoval(remaining, 1)).toBe("c");
	});

	it("selects the previous question when the last one is removed", () => {
		const remaining = editorWith("a").questions;

		expect(selectionAfterRemoval(remaining, 1)).toBe("a");
	});
});

describe("image urls of the cached editor (spec 007)", () => {
	const image = {
		key: "media/user-1/ponte.png",
		placement: "media" as const,
		crop: null,
		altText: null,
	};

	it("remembers the url of an image just uploaded", () => {
		const data = withImageUrl(
			editorWith("a"),
			image.key,
			"https://m/ponte.png",
		);

		expect(data.imageUrls).toEqual({ [image.key]: "https://m/ponte.png" });
		expect(imageUrlOf(data, { image })).toBe("https://m/ponte.png");
	});

	it("has no url without an image or for an unknown key", () => {
		const data = editorWith("a");

		expect(imageUrlOf(data, { image: null })).toBeNull();
		expect(imageUrlOf(data, { image })).toBeNull();
	});
});
