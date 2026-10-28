import { describe, expect, it } from "vitest";

import {
	AccessKeyLimitError,
	InvalidAccessKeyNameError,
} from "../domain/agent-errors";
import { agentsTestDeps } from "../testing/agents-test-deps";
import { createCreateAccessKey } from "./create-access-key";

describe("createAccessKey (spec 044, RN-05, CA-05, CA-06)", () => {
	it("returns the secret once and stores only its hash and start", async () => {
		const deps = agentsTestDeps();
		const createAccessKey = createCreateAccessKey(deps);

		const { key, secret } = await createAccessKey({
			ownerId: "ana",
			name: " Script da escola ",
		});

		expect(secret).toBe("qz_test-1-secret");
		expect(key).toEqual({
			id: "key-1",
			name: "Script da escola",
			start: "qz_test-1",
			createdAt: new Date("2026-10-28T12:00:00.000Z"),
			lastUsedAt: null,
		});
		expect(deps.accessKeys.stored()).toEqual([
			expect.objectContaining({
				secretHash: "hash:qz_test-1-secret",
				ownerId: "ana",
			}),
		]);
		expect(JSON.stringify(deps.accessKeys.stored())).not.toContain(
			'"qz_test-1-secret"',
		);
	});

	it("refuses the 21st active key (AGENT.KEY_LIMIT)", async () => {
		const deps = agentsTestDeps();
		const createAccessKey = createCreateAccessKey(deps);
		for (let index = 0; index < 20; index++) {
			await createAccessKey({ ownerId: "ana", name: `Chave ${index}` });
		}

		await expect(
			createAccessKey({ ownerId: "ana", name: "Mais uma" }),
		).rejects.toBeInstanceOf(AccessKeyLimitError);
		await expect(
			createAccessKey({ ownerId: "bruno", name: "Outra pessoa" }),
		).resolves.toBeTruthy();
	});

	it("refuses an invalid name before writing", async () => {
		const deps = agentsTestDeps();

		await expect(
			createCreateAccessKey(deps)({ ownerId: "ana", name: "  " }),
		).rejects.toBeInstanceOf(InvalidAccessKeyNameError);
		expect(deps.accessKeys.stored()).toEqual([]);
	});
});
