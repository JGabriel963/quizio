import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { sourceUpload } from "../../schema/media";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleSourceUploadRepository } from "./drizzle-source-upload-repository";

const at = (iso: string) => new Date(iso);

describe("DrizzleSourceUploadRepository", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(sourceUpload);
		const uploads = createDrizzleSourceUploadRepository(testDb.db);
		await uploads.add({
			key: "sources/user-1/old.pdf",
			ownerId: "user-1",
			createdAt: at("2026-10-14T10:00:00Z"),
		});
		await uploads.add({
			key: "sources/user-2/older.pdf",
			ownerId: "user-2",
			createdAt: at("2026-10-13T10:00:00Z"),
		});
		await uploads.add({
			key: "sources/user-1/new.pdf",
			ownerId: "user-1",
			createdAt: at("2026-10-16T09:00:00Z"),
		});
	});

	const keys = async () =>
		(await testDb.db.select().from(sourceUpload)).map(({ key }) => key).sort();

	it("takeExpired removes and returns old rows, oldest first", async () => {
		const uploads = createDrizzleSourceUploadRepository(testDb.db);

		const expired = await uploads.takeExpired(at("2026-10-15T10:00:00Z"), 10);

		expect(expired).toEqual([
			"sources/user-2/older.pdf",
			"sources/user-1/old.pdf",
		]);
		expect(await keys()).toEqual(["sources/user-1/new.pdf"]);
	});

	it("takeExpired honors the limit", async () => {
		const uploads = createDrizzleSourceUploadRepository(testDb.db);

		expect(await uploads.takeExpired(at("2026-10-15T10:00:00Z"), 1)).toEqual([
			"sources/user-2/older.pdf",
		]);
		expect(await keys()).toHaveLength(2);
	});

	it("remove is idempotent", async () => {
		const uploads = createDrizzleSourceUploadRepository(testDb.db);

		await uploads.remove("sources/user-1/new.pdf");
		await uploads.remove("sources/user-1/new.pdf");

		expect(await keys()).toEqual([
			"sources/user-1/old.pdf",
			"sources/user-2/older.pdf",
		]);
	});
});
