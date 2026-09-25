import { describe, expect, it } from "vitest";

import { aQuestion } from "./a-question";
import { InMemoryQuestionRepository } from "./in-memory-question-repository";

const a = aQuestion({ id: "a", text: "A" });
const b = aQuestion({ id: "b", text: "B" });
const c = aQuestion({ id: "c", text: "C" });

describe("InMemoryQuestionRepository", () => {
	it("lists a quiz's questions in saved order", async () => {
		const repository = new InMemoryQuestionRepository();

		await repository.saveList("quiz-1", [c, a, b]);

		expect(await repository.listByQuiz("quiz-1")).toEqual([c, a, b]);
		expect(await repository.listByQuiz("quiz-2")).toEqual([]);
	});

	it("saveList replaces the list, dropping missing questions", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-1", [a, b, c]);

		await repository.saveList("quiz-1", [c, a]);

		expect(await repository.listByQuiz("quiz-1")).toEqual([c, a]);
	});

	it("saveList leaves other quizzes untouched", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-1", [a]);
		await repository.saveList("quiz-2", [b]);

		await repository.saveList("quiz-1", [c]);

		expect(await repository.listByQuiz("quiz-2")).toEqual([b]);
	});

	it("saveList never takes over another quiz's question", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-2", [a]);

		await repository.saveList("quiz-1", [{ ...a, text: "Invasor" }]);

		expect(await repository.listByQuiz("quiz-2")).toEqual([a]);
		expect(await repository.listByQuiz("quiz-1")).toEqual([]);
	});

	it("saveQuestion updates content without changing order", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-1", [a, b, c]);

		await repository.saveQuestion("quiz-1", { ...b, text: "B editada" });

		expect(await repository.listByQuiz("quiz-1")).toEqual([
			a,
			{ ...b, text: "B editada" },
			c,
		]);
	});

	it("counts a quiz's questions", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-1", [a, b]);

		expect(await repository.countByQuiz("quiz-1")).toBe(2);
		expect(await repository.countByQuiz("quiz-2")).toBe(0);
	});

	it("deleteAllOfQuiz removes only that quiz's questions", async () => {
		const repository = new InMemoryQuestionRepository();
		await repository.saveList("quiz-1", [a]);
		await repository.saveList("quiz-2", [b]);

		await repository.deleteAllOfQuiz("quiz-1");

		expect(await repository.listByQuiz("quiz-1")).toEqual([]);
		expect(await repository.listByQuiz("quiz-2")).toEqual([b]);
	});
});
