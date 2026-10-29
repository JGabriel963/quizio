import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aQuestion } from "@quizio/core/quiz/testing/a-question";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { mediaUpload } from "../../schema/media";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleProfilePhotoRepository } from "../identity/drizzle-profile-photo-repository";
import { createDrizzleQuestionRepository } from "../quiz/drizzle-question-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "../quiz/drizzle-quiz-version-repository";
import {
	createDrizzleMediaUploadRepository,
	createDrizzleMediaUsage,
} from "./drizzle-media-uploads";

const at = (iso: string) => new Date(iso);
const image = (key: string) => ({
	key,
	placement: "media" as const,
	crop: null,
	altText: null,
});

describe("DrizzleMediaUploadRepository (audit L4)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	it("takes the oldest uploads before the instant, at most `limit`, once", async () => {
		const uploads = createDrizzleMediaUploadRepository(testDb.db);
		for (const [key, createdAt] of [
			["media/u/old.png", "2026-10-14T10:00:00Z"],
			["profiles/u/older.webp", "2026-10-13T10:00:00Z"],
			["media/u/new.png", "2026-10-16T09:00:00Z"],
		] as const) {
			await uploads.addMediaUpload({
				key,
				ownerId: "u",
				createdAt: at(createdAt),
			});
		}

		const before = at("2026-10-15T10:00:00Z");
		expect(await uploads.takeExpiredMediaUploads(before, 1)).toEqual([
			"profiles/u/older.webp",
		]);
		expect(await uploads.takeExpiredMediaUploads(before, 5)).toEqual([
			"media/u/old.png",
		]);
		expect(await uploads.takeExpiredMediaUploads(before, 5)).toEqual([]);
		expect(
			(await testDb.db.select().from(mediaUpload)).map(({ key }) => key),
		).toEqual(["media/u/new.png"]);
	});
});

describe("DrizzleMediaUsage (audit L4)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		await createDrizzleQuizRepository(testDb.db).save(
			aQuiz({ id: "quiz-1", coverImageKey: "media/user-1/cover.png" }),
		);
		await createDrizzleQuestionRepository(testDb.db).saveList("quiz-1", [
			aQuestion({ id: "q1", image: image("media/user-1/live.png") }),
		]);
		await createDrizzleQuizVersionRepository(testDb.db).save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [
					aQuestion({ id: "q1", image: image("media/user-1/published.png") }),
				],
				now: at("2026-10-16T09:00:00Z"),
			}),
		);
		await createDrizzleProfilePhotoRepository(testDb.db).save(
			"user-1",
			"profiles/user-1/me.webp",
		);
	});

	afterAll(() => testDb.close());

	it("finds a file used by a cover, a question, a version or a profile", async () => {
		const usage = createDrizzleMediaUsage(testDb.db);

		for (const key of [
			"media/user-1/cover.png",
			"media/user-1/live.png",
			"media/user-1/published.png",
			"profiles/user-1/me.webp",
		]) {
			expect(await usage.isMediaInUse(key), key).toBe(true);
		}
	});

	it("does not take a key for one that only starts the same", async () => {
		const usage = createDrizzleMediaUsage(testDb.db);

		for (const key of [
			"media/user-1/never.png",
			"media/user-1/cover",
			"media/user-1/published",
			"profiles/user-1/me",
		]) {
			expect(await usage.isMediaInUse(key), key).toBe(false);
		}
	});
});
