import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { session, user } from "../../schema/auth";
import { groupMember, groupPost, groupTable } from "../../schema/groups";
import { accountDeletionFeedback, profilePhoto } from "../../schema/identity";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupRepository } from "../groups/drizzle-group-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleAccountDeletionFeedback } from "./drizzle-account-deletion-feedback";
import { createDrizzleAccountRepository } from "./drizzle-account-repository";
import { createDrizzleProfilePhotoRepository } from "./drizzle-profile-photo-repository";

const at = new Date("2026-10-27T12:00:00.000Z");

describe("Drizzle identity repositories (spec 039)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		await testDb.db.delete(user);
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
	});

	it("profile photo save returns the previous key and remove clears it", async () => {
		const photos = createDrizzleProfilePhotoRepository(testDb.db);

		expect(await photos.save("ana", "profiles/ana/a.webp")).toBeNull();
		expect(await photos.save("ana", "profiles/ana/b.webp")).toBe(
			"profiles/ana/a.webp",
		);
		await photos.save("bruno", "profiles/bruno/c.webp");

		expect(await photos.keyOf("ana")).toBe("profiles/ana/b.webp");
		expect(await photos.keysOf(["ana", "bruno", "nobody"])).toEqual(
			new Map([
				["ana", "profiles/ana/b.webp"],
				["bruno", "profiles/bruno/c.webp"],
			]),
		);
		expect(await photos.keysOf([])).toEqual(new Map());
		expect(await photos.remove("ana")).toBe("profiles/ana/b.webp");
		expect(await photos.keyOf("ana")).toBeNull();
		expect(await photos.remove("ana")).toBeNull();
	});

	it("account find reads the Better Auth user", async () => {
		const accounts = createDrizzleAccountRepository(testDb.db);

		expect(await accounts.find("ana")).toEqual({
			id: "ana",
			name: "Ana",
			email: "ana@quizio.test",
		});
		expect(await accounts.find("nobody")).toBeNull();
	});

	it("account delete cascades sessions, quizzes, photo, managed groups, posts and memberships", async () => {
		const db = testDb.db;
		await db.insert(session).values({
			id: "s1",
			token: "t1",
			userId: "ana",
			expiresAt: new Date("2030-01-01T00:00:00.000Z"),
			createdAt: at,
			updatedAt: at,
		});
		await createDrizzleQuizRepository(db).save(
			aQuiz({ id: "quiz-ana", ownerId: "ana" }),
		);
		await createDrizzleProfilePhotoRepository(db).save(
			"ana",
			"profiles/ana/a.webp",
		);
		const groups = createDrizzleGroupRepository(db);
		const anasGroup = aGroup({ id: "g-ana", adminId: "ana", inviteCode: "c1" });
		const brunosGroup = aGroup({
			id: "g-bruno",
			adminId: "bruno",
			inviteCode: "c2",
		});
		await groups.create(anasGroup, adminOf(anasGroup));
		await groups.create(brunosGroup, adminOf(brunosGroup));
		await db.insert(groupMember).values({
			groupId: "g-bruno",
			userId: "ana",
			role: "member",
			joinedAt: at,
		});
		await db.insert(groupPost).values({
			id: "post-ana",
			groupId: "g-bruno",
			authorId: "ana",
			kind: "message",
			message: "Oi",
			createdAt: at,
		});

		await createDrizzleAccountRepository(db).delete("ana");

		expect(await db.select().from(user)).toEqual([
			expect.objectContaining({ id: "bruno" }),
		]);
		expect(await db.select().from(session)).toEqual([]);
		expect(await db.select().from(quizTable)).toEqual([]);
		expect(await db.select().from(profilePhoto)).toEqual([]);
		expect(
			(await db.select().from(groupTable)).map((group) => group.id),
		).toEqual(["g-bruno"]);
		expect(
			await db.select().from(groupMember).where(eq(groupMember.userId, "ana")),
		).toEqual([]);
		expect(await db.select().from(groupPost)).toEqual([]);
	});

	it("deletion feedback is stored without a user", async () => {
		await createDrizzleAccountDeletionFeedback(testDb.db).add({
			id: "f1",
			reason: "notUsing",
			feedback: "Obrigada",
			at,
		});

		expect(await testDb.db.select().from(accountDeletionFeedback)).toEqual([
			{ id: "f1", reason: "notUsing", feedback: "Obrigada", createdAt: at },
		]);
	});
});
